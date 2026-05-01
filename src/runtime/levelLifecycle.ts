import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import {
	ARCHETYPES,
	BOSSES,
	bossIdForEnemy,
	type Cue,
	type CueAction,
	type EncounterListener,
	type Enemy,
	type FireEvent,
} from '../encounter';
import type { Game } from '../game/Game';
import { awardQuarters, rollBossDrop } from '../game/quarters';

/**
 * Helpers for level scene construction + boss-GLB import + the
 * EncounterListener factory. constructLevel itself remains in main.ts as
 * the boot orchestrator; this module owns the heavy listener factory.
 */

const CAPSULE_HALF_HEIGHT_FOR_BOSS_GLB = 0.9;
const REAPER_SCALE = 2.0;

interface ImportedMeshTree {
	readonly meshes: readonly AbstractMesh[];
	readonly particleSystems?: readonly { dispose(): void }[];
	readonly skeletons?: readonly { dispose(): void }[];
	readonly animationGroups?: readonly { dispose(): void }[];
}

/**
 * Imported nodes arrive as a tree of multiple top-level meshes, plus
 * particle systems, skeletons, and animation groups — each needs its
 * own dispose call. `meshes[0].dispose()` alone leaks the rest, and
 * AnimationGroups in particular hold onto target nodes and observers.
 */
export function disposeImportResult(result: ImportedMeshTree): void {
	for (const m of result.meshes) m.dispose();
	for (const ps of result.particleSystems ?? []) ps.dispose();
	for (const sk of result.skeletons ?? []) sk.dispose();
	for (const ag of result.animationGroups ?? []) ag.dispose();
}

/**
 * Load the archetype GLB for a boss enemy and parent it to the hitbox
 * capsule. Async; bails if the spawn-time scene was disposed before the
 * import resolved (e.g., player died mid-load and the level was torn
 * down) OR if the active scene has changed since dispatch.
 *
 * `getCurrentScene` is a closure passed by main.ts so this helper can
 * check the live `scene` let without owning it.
 */
export function loadBossGlb(
	spawnScene: Scene,
	capsule: AbstractMesh,
	enemy: Enemy,
	getCurrentScene: () => Scene | null,
): void {
	const glb = ARCHETYPES[enemy.archetypeId].glb;
	ImportMeshAsync(`/assets/models/${glb}`, spawnScene)
		.then((result) => {
			if (spawnScene.isDisposed || capsule.isDisposed() || getCurrentScene() !== spawnScene) {
				disposeImportResult(result);
				return;
			}
			const root = result.meshes[0];
			if (!root) return;
			root.name = `boss-glb-${enemy.id}`;
			root.parent = capsule;
			root.position.y = -CAPSULE_HALF_HEIGHT_FOR_BOSS_GLB;
			// Reaper is the final boss — scale up so they read as a ~3m
			// menacing figure. Other bosses are reskinned grunts at native
			// scale.
			if (enemy.archetypeId === 'reaper') {
				root.scaling.setAll(REAPER_SCALE);
			}
		})
		.catch((err) => {
			console.warn(`[boss-glb] failed to load ${glb}`, err);
		});
}

/**
 * Title-screen scene factory. While at the title we render this;
 * `constructLevel` disposes and replaces it on INSERT COIN. The persistent
 * uiScene is the one that hosts all overlays and survives the swap. After
 * game-over / returnToTitle, `routeOverlay` rebuilds this so overlays
 * don't composite over a corpse-of-lobby.
 */
export function buildTitleScene(engine: Engine, sharedBrdf: BaseTexture): Scene {
	const s = new Scene(engine);
	s.environmentBRDFTexture = sharedBrdf;
	s.clearColor = new Color4(0.082, 0.094, 0.11, 1);
	const titleCam = new FreeCamera('title-cam', new Vector3(0, 1.6, 0), s);
	titleCam.minZ = 0.05;
	s.activeCamera = titleCam;
	return s;
}

/**
 * Cross-module dependencies that the EncounterListener needs to read or
 * mutate. The Maps are passed by reference — the listener mutates them
 * in-place. `getScene` reads the live `scene` let (the active gameplay
 * scene); `camera` is captured at construction (`const` in `constructLevel`).
 *
 * `applyDamage` is wired by main.ts to its own `IS_DEV`-gated handler so the
 * `__dordGod` cheat read stays at a Vite compile-time-constant call site
 * and tree-shakes from production bundles.
 */
export interface EncounterListenerHost {
	readonly capsuleHeight: number;
	readonly capsuleRadius: number;
	readonly enemyMeshes: Map<string, AbstractMesh>;
	readonly enemySpawnHp: Map<string, number>;
	readonly enemyLastHitTarget: Map<string, 'head' | 'body' | 'justice'>;
	readonly game: Game;
	readonly camera: FreeCamera;
	getScene(): Scene | null;
	disposeEnemy(enemyId: string): void;
	handleCueAction(action: CueAction): void;
	applyDamage(damage: number): void;
}

/**
 * Build an EncounterListener wired to the given host. Called once per
 * level inside `constructLevel`. The listener holds no internal state
 * beyond what the host exposes — the host's mutable Maps ARE the per-
 * level enemy bookkeeping.
 */
export function createEncounterListener(host: EncounterListenerHost): EncounterListener {
	return {
		onCueFire(cue: Cue, action: CueAction) {
			console.debug('[cue]', cue.id, action.verb);
			host.handleCueAction(action);
		},
		onEnemySpawn(enemy: Enemy) {
			const scene = host.getScene();
			if (!scene) return;
			const mesh = MeshBuilder.CreateCapsule(
				`enemy-${enemy.id}`,
				{ radius: host.capsuleRadius, height: host.capsuleHeight },
				scene,
			);
			mesh.position.copyFrom(enemy.position);
			mesh.position.y += host.capsuleHeight / 2;
			// Placeholder material so the capsule reads as a threat until
			// archetype GLBs land. Without this, the capsule has no material
			// and renders as a near-invisible default-shaded silhouette,
			// which is what the visual audit caught.
			const mat = new StandardMaterial(`mat-enemy-${enemy.id}`, scene);
			const isBoss = bossIdForEnemy(enemy.id) !== null;
			// Bosses get a distinct color so they're not lost in a wave of
			// red grunt-capsules. Reaper goes near-black/purple; the other
			// four bosses go gold so the player knows which target carries
			// the boss HP bar.
			if (enemy.archetypeId === 'reaper') {
				mat.diffuseColor = new Color3(0.4, 0.05, 0.4);
				mat.emissiveColor = new Color3(0.25, 0.0, 0.25);
			} else if (isBoss) {
				mat.diffuseColor = new Color3(0.95, 0.75, 0.15);
				mat.emissiveColor = new Color3(0.3, 0.2, 0.0);
			} else {
				mat.diffuseColor = new Color3(0.85, 0.18, 0.18);
				mat.emissiveColor = new Color3(0.12, 0.0, 0.0);
			}
			mat.specularColor = new Color3(0.05, 0.05, 0.05);
			mesh.material = mat;
			mesh.metadata = { enemyId: enemy.id };
			host.enemySpawnHp.set(enemy.id, enemy.hp);
			host.enemyMeshes.set(enemy.id, mesh);
			// For bosses, attempt to load the archetype GLB and parent it to
			// the capsule. The capsule remains as the hitbox; the GLB is
			// purely visual. If the GLB load fails (404, network), the
			// colored capsule stays as the visible body.
			if (isBoss) {
				loadBossGlb(scene, mesh, enemy, host.getScene);
			}
		},
		onEnemyMove(enemyId, position) {
			const mesh = host.enemyMeshes.get(enemyId);
			if (!mesh) return;
			mesh.position.copyFrom(position);
			mesh.position.y += host.capsuleHeight / 2;
		},
		onEnemyHit(enemyId, target, _damage) {
			host.enemyLastHitTarget.set(enemyId, target);
		},
		onEnemyKill(enemyId) {
			// Read the last-hit-target BEFORE dispose — `disposeEnemy` clears
			// the map entry now (C.5 fix) so reading after would always get
			// the 'body' fallback and silently downgrade head/justice scoring.
			const target = host.enemyLastHitTarget.get(enemyId) ?? 'body';
			host.disposeEnemy(enemyId);
			host.game.hit(target);
			// Boss kills drop quarters per docs/spec/06-economy.md.
			const bossId = bossIdForEnemy(enemyId);
			if (bossId !== null) {
				const drop = rollBossDrop(BOSSES[bossId].quarterDrop);
				if (drop > 0) {
					awardQuarters(drop).catch((err) => {
						console.error(`[economy] failed to award boss drop for ${bossId}`, err);
					});
				}
			}
		},
		onEnemyCease(enemyId) {
			host.disposeEnemy(enemyId);
		},
		onFireEvent(_enemyId, event: FireEvent) {
			void event;
		},
		onPlayerDamage(damage) {
			// `applyDamage` carries the `IS_DEV`-gated `__dordGod` check at its
			// definition site in main.ts, where `IS_DEV` is a Vite compile-time
			// constant. The whole cheat surface tree-shakes in prod builds.
			host.applyDamage(damage);
		},
		onCameraUpdate(position, lookAt) {
			host.camera.position.copyFrom(position);
			host.camera.setTarget(lookAt);
		},
	};
}
