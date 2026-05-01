import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Scene } from '@babylonjs/core/scene';
import { ARCHETYPES, type Enemy } from '../encounter';

/**
 * Helpers for level scene construction + boss-GLB import. The big
 * `constructLevel` function still lives in `main.ts` because its
 * `EncounterListener` factory closes over ~12 cross-module symbols
 * (game, IS_DEV, bossIdForEnemy, rollBossDrop, awardQuarters, the four
 * enemy bookkeeping Maps, plus handleCueAction). Hoisting that listener
 * cleanly is its own architectural piece — the helpers here are the part
 * that DOES extract cleanly without a 12-arg callback bag.
 */

const CAPSULE_HALF_HEIGHT_FOR_BOSS_GLB = 0.9;
const REAPER_SCALE = 2.0;

interface ImportedMeshTree {
	readonly meshes: readonly AbstractMesh[];
	readonly particleSystems?: readonly { dispose(): void }[];
	readonly skeletons?: readonly { dispose(): void }[];
}

/**
 * Imported nodes arrive as a tree of multiple top-level meshes, plus
 * particle systems and skeletons that need their own dispose calls to
 * release GPU buffers — `meshes[0].dispose()` alone leaks the rest.
 */
export function disposeImportResult(result: ImportedMeshTree): void {
	for (const m of result.meshes) m.dispose();
	for (const ps of result.particleSystems ?? []) ps.dispose();
	for (const sk of result.skeletons ?? []) sk.dispose();
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
