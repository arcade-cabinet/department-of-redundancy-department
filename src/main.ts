import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { GetEnvironmentBRDFTexture } from '@babylonjs/core/Misc/brdfTextureTools';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Audio/audioEngine';
import '@babylonjs/core/Culling/ray'; // side-effect: enables scene.pick / pickWithRay
import '@babylonjs/loaders/glTF';

import { AudioBus } from './audio/AudioBus';
import {
	ARCHETYPES,
	BOSSES,
	bossIdForEnemy,
	type Cue,
	type CueAction,
	EncounterDirector,
	type EncounterListener,
	type Enemy,
	type FireEvent,
} from './encounter';
import { drainPendingCues, isHandlesDependent } from './encounter/pendingCueQueue';
import { installTestHooks, now } from './engine/clock';
import { Game } from './game/Game';
import type { GameState } from './game/GameState';
import {
	awardQuarters,
	getBalance,
	getLifetimeStats,
	grantFriendBailout,
	initQuarters,
	rollBossDrop,
	spendQuarter,
	subscribe as subscribeQuarters,
} from './game/quarters';
import {
	CabinetStatsOverlay,
	ContinueOverlay,
	FriendModalOverlay,
	GameOverOverlay,
	HighScoresOverlay,
	HudOverlay,
	InsertCoinOverlay,
	NarratorOverlay,
	Overlay,
	Reticle,
	SettingsOverlay,
} from './gui';
import { getLevel, type Level } from './levels';
import { applyDoorOpen, applyShutterState, buildLevel, type LevelHandles } from './levels/build';
import type { Door, LevelId, Light, Shutter } from './levels/types';
import {
	loadHighScore,
	loadHighScores,
	loadSettings,
	recordHighScore,
	type Settings,
	saveSettings,
} from './preferences';
import { createRuntimeContext } from './runtime/context';
import {
	type PickResult,
	pickAt as pickAtImpl,
	reticleColorFor as reticleColorForImpl,
} from './runtime/picking';

/**
 * src/main.ts — runtime boot.
 *
 * Owns: Babylon Engine, Scene, current Level, EncounterDirector, GUI overlays,
 * Game state machine, quarter-balance subscription. Ticks once per frame.
 *
 * Per the canonical-run pivot: INSERT COIN → playing direct (no picker, no
 * daily, no modifier toggles). Continues consume 1 quarter from the
 * persistent balance. Zero balance + INSERT COIN fires the friend modal.
 */

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) {
	throw new Error('main.ts: <canvas id="game"> not found in DOM');
}

// Placeholder capsule geometry used for both enemies and civilians until
// archetype GLBs land. Height 1.8 → half-height 0.9 lifts the capsule center
// off the rail's foot-position; pickRay headshot math uses the same value.
const CAPSULE_HEIGHT = 1.8;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_HALF_HEIGHT = CAPSULE_HEIGHT / 2;

const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false });

// Persistent UI scene. Hosts the AdvancedDynamicTexture for ALL overlays
// (HUD, reticle, insert-coin, continue, game-over, settings, ledgers). Never
// disposed. `autoClear=false` so it composites on top of the gameplay scene
// instead of wiping its framebuffer. The gameplay scene is rendered first in
// `tick()`, then `uiScene.render()` draws the GUI on top.
//
// Why this exists: ADTs are owned by their host scene. When constructLevel
// did `scene.dispose()` on INSERT COIN, the title-bound GUI texture died
// with it, leaving every gameplay overlay silently mounting on a dead
// surface (HUD invisible, reticle gone, continue-prompt never rendered).
const uiScene = new Scene(engine);
uiScene.autoClear = false;
uiScene.autoClearDepthAndStencil = false;
{
	const uiCam = new FreeCamera('ui-cam', new Vector3(0, 0, -10), uiScene);
	// Explicit target so Babylon's view-matrix update never hits the
	// degenerate position==target case (which can produce NaN on some
	// builds and emit a "no active camera" warning on the first render).
	uiCam.setTarget(Vector3.Zero());
	uiScene.activeCamera = uiCam;
}

// PBR materials in every gameplay level (drywall / carpet / laminate /
// ceiling-tile / whiteboard) trigger Babylon's environment BRDF lookup
// texture load on first instantiation. The BRDF texture is RGBD-encoded
// and decoded asynchronously via `RGBDTextureTools.ExpandRGBDTexture`,
// which schedules `texture.getScene().postProcessManager.directRender(...)`
// inside an `executeWhenCompiled` callback. If the gameplay scene
// disposes between scheduling and the callback firing, the disposed
// scene's `postProcessManager` is null and the engine throws
// `Cannot read properties of null (reading 'postProcessManager')` —
// the exact error reproduced by the e2e canonical-run test on every
// level transition.
//
// Fix: pre-warm the BRDF texture on the long-lived `uiScene` (never
// disposed), then re-use it across every gameplay scene by assigning
// `scene.environmentBRDFTexture = sharedBrdf` before any PBR material
// gets a chance to call `loadBRDFTexture`. The lazy loader bails out
// when `scene[textureProperty]` is already set, so the async path
// never runs against a soon-to-be-disposed scene.
const sharedBrdf = GetEnvironmentBRDFTexture(uiScene);

// Title-screen scene. While at the title we render this; constructLevel
// disposes and replaces it on INSERT COIN. The UI scene above is the one
// that hosts all overlays and survives the swap. After game-over /
// returnToTitle, `enterTitleScene()` rebuilds this so overlays don't
// composite over a corpse-of-lobby.
function buildTitleScene(): Scene {
	const s = new Scene(engine);
	s.environmentBRDFTexture = sharedBrdf;
	s.clearColor = new Color4(0.082, 0.094, 0.11, 1);
	const titleCam = new FreeCamera('title-cam', new Vector3(0, 1.6, 0), s);
	titleCam.minZ = 0.05;
	s.activeCamera = titleCam;
	return s;
}

const runtime = createRuntimeContext();

let scene: Scene | null = buildTitleScene();
let currentCamera: FreeCamera | null = null;
let director: EncounterDirector | null = null;
let currentLevel: Level | null = null;
let levelHandles: LevelHandles | null = null;
let audioBus: AudioBus | null = null;

// Per-enemy bookkeeping for the reticle gradient and kill scoring.
// Mesh refs cached so hit/kill/cease lookups are O(1) instead of scene
// linear searches via getMeshByName.
const enemySpawnHp = new Map<string, number>();
const enemyLastHitTarget = new Map<string, 'head' | 'body' | 'justice'>();
const enemyMeshes = new Map<string, AbstractMesh>();
const healthKitMeshes = new Map<string, AbstractMesh>();
// Cue actions whose handlers read `levelHandles` are queued here when they
// fire before `buildLevel(...)` resolves. Drained on handles-ready. Cleared
// on level transition. See `handleCueAction`.
const pendingCueActions: CueAction[] = [];

const game = new Game();

// Module-level dev/prod constant. Vite inlines `import.meta.env.PROD` at
// build time, so `IS_DEV` is a compile-time constant. Every `if (IS_DEV)`
// branch tree-shakes to nothing in production — including the god-mode
// short-circuit in `onPlayerDamage` below. Without this hoist, the
// runtime `globalThis.__dordGod` read survives in shipped bundles and
// becomes a trivially-discoverable cheat surface.
const IS_DEV = !(import.meta?.env?.PROD ?? false);

// Debug surface for visual-audit screenshots — exposes the Game state
// machine + engine handle so the audit harness can drive overlays without
// pointer-event flakiness. Stripped from production by `IS_DEV`.
if (IS_DEV) {
	(globalThis as { __dord?: unknown }).__dord = {
		game,
		engine,
		// Jump directly to a level for the visual audit. Tears down the
		// current level scene and constructs the target. Dev-only — gated by
		// the same PROD check that strips the rest of this surface.
		jumpToLevel: (id: LevelId) => {
			constructLevel(id);
			game.transitionLevel(id);
		},
		// Fast-forward the encounter director by `ms` of simulated time. The
		// director's tick handles arbitrary deltas, so feeding a 30000ms tick
		// jumps the rail through any number of dwell windows. Used by the
		// visual-audit harness to reach mid-/late-level camera positions
		// without waiting real time. Clamped to non-negative finite to
		// guard against negative or NaN deltas corrupting director state.
		fastForward: (ms: number) => director?.tick(Math.max(0, Number.isFinite(ms) ? ms : 0)),
		// Used by Playwright e2e tests to await async `buildLevel`
		// completion after a jumpToLevel — the render guard skips frames
		// until handles are populated, so without this hook the scene
		// stays black throughout a fast-jump test.
		levelHandlesReady: () => levelHandles !== null,
		// Engine-clock now(). Tests must use this rather than
		// `performance.now()` to honour the engine clock facade
		// (profiles/ts-browser-game.md): once `?frame=N` test mode lands,
		// `performance.now()` and `now()` will diverge, and any test
		// passing real time to `game.insertCoin` would break.
		now,
		// Returns the screen-space center of every active enemy capsule,
		// in CSS pixels relative to the page (so a Playwright
		// `dispatchEvent(pointerdown, {clientX, clientY})` lands on the
		// reticle pickray). Used by the e2e fire→kill test to drive the
		// real shooting pipeline (pickAt → director.hitEnemy → onEnemyKill)
		// without faking enemy positions or bypassing pointer wiring.
		enemySnapshots: (): Array<{ id: string; clientX: number; clientY: number; hp: number }> => {
			if (!scene?.activeCamera || !director) return [];
			const cam = scene.activeCamera;
			const rect = canvas.getBoundingClientRect();
			const rw = engine.getRenderWidth();
			const rh = engine.getRenderHeight();
			const viewport = cam.viewport.toGlobal(rw, rh);
			const transform = scene.getTransformMatrix();
			// `Vector3.Project(local, world, viewProj, viewport)` applies world×viewProj
			// internally. Passing `absolutePosition` AS the local vector requires
			// the world matrix to be `Identity` — otherwise the world transform is
			// applied twice and the projected coords land somewhere off-screen.
			const identity = Matrix.IdentityReadOnly;
			const out: Array<{ id: string; clientX: number; clientY: number; hp: number }> = [];
			for (const [id, mesh] of enemyMeshes) {
				const enemy = director.getEnemy(id);
				if (!enemy) continue;
				const projected = Vector3.Project(mesh.absolutePosition, identity, transform, viewport);
				// Project returns render-target pixels (engine size). Convert to
				// CSS pixels by scaling against the canvas's bounding rect.
				const clientX = rect.left + (projected.x / rw) * rect.width;
				const clientY = rect.top + (projected.y / rh) * rect.height;
				out.push({ id, clientX, clientY, hp: enemy.hp });
			}
			return out;
		},
	};
	// God-mode toggle for the visual-audit harness. When true, takeDamage
	// is short-circuited so the audit can fast-forward through firing
	// enemies without dying mid-screenshot.
	(globalThis as { __dordGod?: boolean }).__dordGod = false;
}
const overlay = new Overlay('dord-ui', uiScene);
const reticle = new Reticle(overlay);

let activeOverlayDispose: (() => void) | null = null;
// Bumped every time routeOverlay disposes the prior overlay. Async overlay
// constructors (e.g. high-scores' loadHighScores) capture this token at
// dispatch time and bail when it has changed by resolution time, so they
// cannot install a stale overlay over a newer phase.
let overlayGeneration = 0;
let hud: HudOverlay | null = null;
let narrator: NarratorOverlay | null = null;

// Install `?frame=N` deterministic-replay hook BEFORE the first wall-clock
// read. Otherwise `lastTickMs` would be captured at virtualMs=0, then
// installTestHooks would jump virtualMs forward by `?frame=N`, giving the
// first tick a 64ms-clamped delta — silently breaking frame 1 of replay.
// In production builds (Vite `import.meta.env.PROD`) this is a no-op stub
// so the test surface is tree-shaken from the shipped bundle.
installTestHooks();

let lastTickMs = now();

const settings: Settings = await loadSettings();
await initQuarters();

// Keep the HUD's quarter readout in sync with the persistent balance.
subscribeQuarters((balance) => {
	hud?.setQuarters(balance);
});

window.addEventListener('resize', () => engine.resize());
document.addEventListener('visibilitychange', () => {
	// Pause/resume when tab loses/gains focus. No Capacitor app lifecycle.
	if (document.hidden) {
		engine.stopRenderLoop();
	} else {
		engine.runRenderLoop(tick);
	}
});

// ── Game state → overlay routing ─────────────────────────────────────────────

game.subscribe((state) => routeOverlay(state));

function routeOverlay(state: GameState): void {
	if (activeOverlayDispose) {
		activeOverlayDispose();
		activeOverlayDispose = null;
	}
	overlayGeneration++;
	reticle.setVisible(state.phase === 'playing');
	const wantsHud = state.phase === 'playing' || state.phase === 'continue-prompt';
	if (wantsHud && !hud) {
		hud = new HudOverlay(overlay);
		hud.setQuarters(getBalance());
		narrator = new NarratorOverlay(overlay);
	} else if (!wantsHud && hud) {
		hud.dispose();
		hud = null;
		narrator?.dispose();
		narrator = null;
	}
	hud?.render(state);
	switch (state.phase) {
		case 'insert-coin': {
			// If we just returned from a run, the gameplay scene is still alive
			// behind the overlay — tear it down and rebuild the title scene so
			// the title-screen overlays don't composite over a corpse-of-level.
			if (scene && scene.activeCamera?.name !== 'title-cam') {
				// Null director/audioBus FIRST so any in-flight observable
				// callbacks during scene.dispose() can't dereference a
				// half-cleaned-up world.
				director = null;
				audioBus = null;
				scene.dispose();
				scene = buildTitleScene();
				currentCamera = null;
				runtime.cameraShake.reset();
				levelHandles = null;
				currentLevel = null;
				enemySpawnHp.clear();
				enemyLastHitTarget.clear();
				enemyMeshes.clear();
				healthKitMeshes.clear();
				runtime.civilians.clear();
				runtime.propAnims.clear();
				pendingCueActions.length = 0;
			}
			const coin = new InsertCoinOverlay(
				overlay,
				() => handleInsertCoin(),
				() => game.openHighScores(),
				() => game.openCabinetStats(),
			);
			activeOverlayDispose = () => coin.dispose();
			break;
		}
		case 'high-scores': {
			const generation = overlayGeneration;
			void loadHighScores().then((scores) => {
				// Bail if the user navigated away (or back-and-forth) while
				// the load was in flight — installing this overlay now would
				// orphan whatever has replaced it.
				if (generation !== overlayGeneration) return;
				if (game.getState().phase !== 'high-scores') return;
				const panel = new HighScoresOverlay(overlay, scores, () => game.closeHighScores());
				activeOverlayDispose = () => panel.dispose();
			});
			break;
		}
		case 'cabinet-stats': {
			// Synchronous read — getLifetimeStats() returns the cached snapshot
			// that initQuarters() populated at boot, so no async race window.
			const stats = getLifetimeStats();
			const panel = new CabinetStatsOverlay(overlay, stats, () => game.closeCabinetStats());
			activeOverlayDispose = () => panel.dispose();
			break;
		}
		case 'playing': {
			break;
		}
		case 'continue-prompt': {
			const balance = getBalance();
			if (balance <= 0) {
				// Out of quarters → run wipes immediately. No continue offered.
				game.endRun(true);
				break;
			}
			const cont = new ContinueOverlay(
				overlay,
				balance,
				() => {
					void handleContinue();
				},
				() => game.endRun(true),
			);
			activeOverlayDispose = () => cont.dispose();
			break;
		}
		case 'game-over':
		case 'victory': {
			const run = state.run;
			if (!run) break;
			void emitGameOver(state, run.score, state.phase === 'victory');
			break;
		}
		case 'settings': {
			const overlayInstance = new SettingsOverlay(
				overlay,
				settings,
				(next) => {
					Object.assign(settings, next);
					audioBus?.updateSettings(next);
					void saveSettings(next);
				},
				() => game.closeSettings(),
			);
			activeOverlayDispose = () => overlayInstance.dispose(overlay);
			break;
		}
	}
}

// Set when the friend modal is on screen so a rapid second tap on the
// title-screen INSERT COIN button cannot stack a second modal (which would
// resolve into a double bailout). Always cleared in the modal dismiss.
let friendModalOpen = false;

function handleInsertCoin(): void {
	if (getBalance() > 0) {
		audioBus?.playStinger('ui/ui-confirm.mp3', 0.7);
		game.insertCoin(now());
		return;
	}
	if (friendModalOpen) return;
	friendModalOpen = true;
	// Friend bailout sting — cheery pickup-style cue announces the modal.
	// Reused from the inventory pickup library per docs/spec/06-economy.md
	// audio polish item.
	audioBus?.playStinger('inventory/pickup-coffee.ogg', 0.9);
	// Zero balance → friend modal, then auto-start the run. Caller is
	// always in 'insert-coin' phase; dispose the InsertCoinOverlay so the
	// modal sits alone on the screen.
	if (activeOverlayDispose) {
		activeOverlayDispose();
		activeOverlayDispose = null;
	}
	let modalDisposed = false;
	const disposeOnce = (): void => {
		if (modalDisposed) return;
		modalDisposed = true;
		modal.dispose();
	};
	const modal = new FriendModalOverlay(overlay, () => {
		audioBus?.playStinger('ui/ui-confirm.mp3', 0.7);
		disposeOnce();
		activeOverlayDispose = null;
		// Hold `friendModalOpen=true` until the bailout has resolved so a
		// rapid re-tap of INSERT COIN cannot stack a second modal (and a
		// second +8 grant) while the first grant is still in flight.
		grantFriendBailout()
			.then(() => game.insertCoin(now()))
			.catch((err) => {
				console.error('[economy] friend bailout failed', err);
				// Still let the player play — re-route to insert-coin so they
				// can tap again or see the modal again with a fresh attempt.
				game.returnToTitle();
			})
			.finally(() => {
				friendModalOpen = false;
			});
	});
	activeOverlayDispose = () => {
		disposeOnce();
		friendModalOpen = false;
	};
}

async function handleContinue(): Promise<void> {
	const ok = await spendQuarter();
	if (!ok) {
		game.endRun(true);
		return;
	}
	game.continueRun();
}

async function emitGameOver(state: GameState, score: number, cleared: boolean): Promise<void> {
	const run = state.run;
	if (!run) return;
	const utcDate = new Date().toISOString().slice(0, 10);
	// recordHighScore inserts into the persistent top-N table AND syncs the
	// legacy single-best key. `rank === 1` means the run took the #1 slot;
	// the GameOver banner historically gates on "is this the new best,"
	// which is equivalent to rank=1.
	const rank = await recordHighScore({ score, clearedRun: cleared, utcDate });
	const newHighScore = rank === 1;
	const summary = {
		score,
		newHighScore,
		enemiesKilled: run.enemiesKilled,
		headshots: run.headshots,
		justiceShots: run.justiceShots,
		civilianHits: run.civilianHits,
		elapsedMs: now() - run.startedAtMs,
		clearedRun: cleared,
	};
	const overlayInstance = new GameOverOverlay(overlay, summary, () => {
		// "Another coin?" — return to insert-coin, then handleInsertCoin chooses
		// between free-start and friend-modal based on the persisted balance.
		game.returnToTitle();
	});
	activeOverlayDispose = () => overlayInstance.dispose(overlay);
	void loadHighScore(); // pre-warm cache for next coin
}

// ── Level construction ──────────────────────────────────────────────────────

// Imported nodes arrive as a tree of multiple top-level meshes, plus
// particle systems and skeletons that need their own dispose calls to
// release GPU buffers — `meshes[0].dispose()` alone leaks the rest.
function disposeImportResult(result: {
	readonly meshes: readonly AbstractMesh[];
	readonly particleSystems?: readonly { dispose(): void }[];
	readonly skeletons?: readonly { dispose(): void }[];
}): void {
	for (const m of result.meshes) m.dispose();
	for (const ps of result.particleSystems ?? []) ps.dispose();
	for (const sk of result.skeletons ?? []) sk.dispose();
}

// Load the archetype GLB for a boss enemy and parent it to the hitbox
// capsule. Async; bails if the spawn-time scene was disposed before the
// import resolved (e.g., player died mid-load and the level was torn down).
function loadBossGlb(spawnScene: Scene, capsule: AbstractMesh, enemy: Enemy): void {
	const glb = ARCHETYPES[enemy.archetypeId].glb;
	ImportMeshAsync(`/assets/models/${glb}`, spawnScene)
		.then((result) => {
			if (spawnScene.isDisposed || capsule.isDisposed() || scene !== spawnScene) {
				disposeImportResult(result);
				return;
			}
			const root = result.meshes[0];
			if (!root) return;
			root.name = `boss-glb-${enemy.id}`;
			root.parent = capsule;
			root.position.y = -CAPSULE_HALF_HEIGHT;
			// Reaper is the final boss — scale up so they read as a ~3m
			// menacing figure. Other bosses are reskinned grunts at native
			// scale.
			if (enemy.archetypeId === 'reaper') {
				root.scaling.setAll(2.0);
			}
		})
		.catch((err) => {
			console.warn(`[boss-glb] failed to load ${glb}`, err);
		});
}

function constructLevel(levelId: LevelId): void {
	// Pause the render loop across the dispose+rebuild boundary. Defence
	// against any partial-frame rendering of a scene that's mid-teardown
	// or a brand-new scene whose camera/handles aren't wired yet. The
	// loop is re-attached at the bottom of this function once the new
	// scene is fully constructed and the async `buildLevel` is dispatched.
	engine.stopRenderLoop(tick);
	if (scene) {
		scene.dispose();
		scene = null;
		currentCamera = null;
		runtime.cameraShake.reset();
		levelHandles = null;
		audioBus = null;
		runtime.fireAlarm.clear(levelHandles);
		runtime.lightTweens.clear();
		enemySpawnHp.clear();
		enemyLastHitTarget.clear();
		enemyMeshes.clear();
		healthKitMeshes.clear();
		runtime.civilians.clear();
		runtime.propAnims.clear();
		// Discard — the level is gone, queued cues for it are obsolete.
		// Distinct from the drain in `buildLevel(...).then`, which captures
		// a snapshot before re-dispatching.
		pendingCueActions.length = 0;
	}
	currentLevel = getLevel(levelId);
	scene = new Scene(engine);
	// Reuse the BRDF texture loaded on `uiScene` so PBR materials in
	// this level skip the async `loadBRDFTexture` path entirely. See the
	// `sharedBrdf` declaration above for the full rationale (postProcessManager
	// race during scene dispose).
	scene.environmentBRDFTexture = sharedBrdf;
	audioBus = new AudioBus(scene, settings);
	for (const layer of currentLevel.ambienceLayers) {
		audioBus.startAmbience(layer.id, layer.audio, layer.volume, layer.loop);
	}

	const camera = new FreeCamera('camera', new Vector3(0, 1.6, 0), scene);
	camera.minZ = 0.05;
	camera.fov = 1.2; // ~70°
	scene.activeCamera = camera;
	currentCamera = camera;

	const builtScene = scene;
	const builtLevel = currentLevel;
	void buildLevel(builtScene, builtLevel).then((handles) => {
		if (scene !== builtScene) return;
		levelHandles = handles;
		// Capture health-kit meshes for pickAt + collection bookkeeping.
		for (const [id, mesh] of handles.healthKits) {
			healthKitMeshes.set(id, mesh);
		}
		// Drain any cues that fired before handles arrived. Snapshot + clear
		// first so re-entrant pushes into the queue (rare) aren't iterated
		// in the same pass.
		for (const action of drainPendingCues(pendingCueActions)) {
			handleCueAction(action);
		}
	});

	const listener: EncounterListener = {
		onCueFire(cue: Cue, action: CueAction) {
			console.debug('[cue]', cue.id, action.verb);
			handleCueAction(action);
		},
		onEnemySpawn(enemy: Enemy) {
			if (!scene) return;
			const mesh = MeshBuilder.CreateCapsule(
				`enemy-${enemy.id}`,
				{ radius: CAPSULE_RADIUS, height: CAPSULE_HEIGHT },
				scene,
			);
			mesh.position.copyFrom(enemy.position);
			mesh.position.y += CAPSULE_HALF_HEIGHT;
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
			enemySpawnHp.set(enemy.id, enemy.hp);
			enemyMeshes.set(enemy.id, mesh);

			// For bosses, attempt to load the archetype GLB and parent it to
			// the capsule. The capsule remains as the hitbox; the GLB is
			// purely visual. If the GLB load fails (404, network), the
			// colored capsule stays as the visible body.
			if (isBoss) {
				loadBossGlb(scene, mesh, enemy);
			}
		},
		onEnemyMove(enemyId, position) {
			const mesh = enemyMeshes.get(enemyId);
			if (!mesh) return;
			mesh.position.copyFrom(position);
			mesh.position.y += CAPSULE_HALF_HEIGHT;
		},
		onEnemyHit(enemyId, target, _damage) {
			enemyLastHitTarget.set(enemyId, target);
		},
		onEnemyKill(enemyId) {
			disposeEnemy(enemyId);
			const target = enemyLastHitTarget.get(enemyId) ?? 'body';
			game.hit(target);
			enemyLastHitTarget.delete(enemyId);
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
			disposeEnemy(enemyId);
			enemyLastHitTarget.delete(enemyId);
		},
		onFireEvent(_enemyId, event: FireEvent) {
			void event;
		},
		onPlayerDamage(damage) {
			// `IS_DEV` is a Vite compile-time constant — this entire branch
			// tree-shakes in production builds, so the `__dordGod` cheat
			// surface never ships.
			if (IS_DEV && (globalThis as { __dordGod?: boolean }).__dordGod) return;
			game.takeDamage(damage);
		},
		onCameraUpdate(position, lookAt) {
			camera.position.copyFrom(position);
			camera.setTarget(lookAt);
		},
	};

	director = new EncounterDirector({
		cameraRail: currentLevel.cameraRail,
		cues: [...currentLevel.cues],
		spawnRails: [...currentLevel.spawnRails],
		// Director is locked to the canonical Normal column per
		// docs/spec/03-difficulty-and-modifiers.md (post-pivot).
		difficulty: 'normal',
		listener,
	});
	// Re-attach the render loop now that the new scene + camera + director
	// are wired. The render guard (`if scene?.activeCamera ...`) keeps
	// the gameplay scene off-screen until `levelHandles` resolves; the
	// uiScene draws normally throughout.
	engine.runRenderLoop(tick);
}

function handleCueAction(action: CueAction): void {
	// If the cue's handler reads `levelHandles` and the build hasn't
	// resolved yet, queue and drain on handles-ready. See
	// src/encounter/pendingCueQueue.ts for the verb classification.
	if (levelHandles === null && isHandlesDependent(action)) {
		pendingCueActions.push(action);
		return;
	}
	switch (action.verb) {
		case 'transition':
			constructLevel(action.toLevelId);
			game.transitionLevel(action.toLevelId);
			return;
		case 'door':
			handleDoorCue(action.doorId, action.to);
			return;
		case 'lighting':
			runtime.lightTweens.handle(levelHandles, action.lightId, action.tween);
			return;
		case 'civilian-spawn': {
			runtime.civilians.spawn(scene, currentLevel, action.railId, CAPSULE_HEIGHT, CAPSULE_RADIUS);
			return;
		}
		case 'audio-stinger': {
			audioBus?.playStinger(action.audio, action.volume);
			return;
		}
		case 'ambience-fade': {
			audioBus?.fadeAmbience(action.layerId, action.toVolume, action.durationMs);
			return;
		}
		case 'narrator': {
			narrator?.show(action.text, action.durationMs);
			return;
		}
		case 'camera-shake': {
			runtime.cameraShake.begin(action.intensity, action.durationMs);
			return;
		}
		case 'shutter':
			handleShutterCue(action.shutterId, action.to);
			return;
		case 'level-event':
			handleLevelEvent(action.event);
			return;
		case 'prop-anim':
			runtime.propAnims.handle(levelHandles, action.propId, action.animId);
			return;
		default:
			return;
	}
}

function handleDoorCue(doorId: string, to: 'open' | 'closed'): void {
	const mesh = levelHandles?.doors.get(doorId);
	if (!mesh || !currentLevel) return;
	const doorPrim = currentLevel.primitives.find(
		(p): p is Door => p.kind === 'door' && p.id === doorId,
	);
	if (doorPrim && to === 'open') applyDoorOpen(mesh, doorPrim);
}

function handleShutterCue(shutterId: string, to: 'down' | 'up' | 'half'): void {
	const mesh = levelHandles?.shutters.get(shutterId);
	if (!mesh || !currentLevel) return;
	const shutterPrim = currentLevel.primitives.find(
		(p): p is Shutter => p.kind === 'shutter' && p.id === shutterId,
	);
	if (shutterPrim) applyShutterState(mesh, shutterPrim, to);
}

function handleLevelEvent(
	event: 'fire-alarm' | 'power-out' | 'lights-restored' | 'elevator-ding',
): void {
	if (!levelHandles || !currentLevel) return;
	switch (event) {
		case 'power-out':
			handlePowerOut();
			return;
		case 'lights-restored':
			handleLightsRestored();
			return;
		case 'fire-alarm':
			handleFireAlarm();
			return;
		case 'elevator-ding':
			handleElevatorDing();
			return;
	}
}

function handlePowerOut(): void {
	if (!levelHandles) return;
	for (const light of levelHandles.lights.values()) light.intensity = 0;
}

function handleLightsRestored(): void {
	if (!levelHandles || !currentLevel) return;
	for (const prim of currentLevel.primitives) {
		if (prim.kind !== 'light') continue;
		const lightPrim = prim as Light;
		const bl = levelHandles.lights.get(lightPrim.id);
		if (bl) bl.intensity = lightPrim.intensity;
	}
}

// Lobby Position-1 opener per docs/spec/levels/01-lobby.md: klaxon looped
// under the level audio + 4Hz red flicker on level lights + auto-open every
// spawn-rail door so the wave that follows reads as "alarm tripped, exits
// releasing." Without this the fire-alarm cue silently no-op'd and the
// lobby's scripted opener never played for the player.
function handleFireAlarm(): void {
	if (!levelHandles || !currentLevel) return;
	audioBus?.startAmbience('fire-alarm-klaxon', 'sfx/klaxon-loop.ogg', 0.6, true);
	runtime.fireAlarm.start(levelHandles);
	openDoorsBy((door) => door.spawnRailId != null);
}

// Lobby exit + HR-corridor exit set piece — stinger + open the lift door.
function handleElevatorDing(): void {
	if (!levelHandles || !currentLevel) return;
	audioBus?.playStinger('stingers/elevator-ding.ogg', 0.7);
	openDoorsBy((door) => door.family === 'lift');
}

function openDoorsBy(predicate: (door: Door) => boolean): void {
	if (!levelHandles || !currentLevel) return;
	for (const prim of currentLevel.primitives) {
		if (prim.kind !== 'door') continue;
		const door = prim as Door;
		if (!predicate(door)) continue;
		const mesh = levelHandles.doors.get(door.id);
		if (mesh) applyDoorOpen(mesh, door);
	}
}

function disposeEnemy(enemyId: string): void {
	const mesh = enemyMeshes.get(enemyId);
	mesh?.dispose();
	enemyMeshes.delete(enemyId);
	enemySpawnHp.delete(enemyId);
}

// ── Main loop ────────────────────────────────────────────────────────────────

function tick(): void {
	const tickT = now();
	const dtMs = Math.min(64, tickT - lastTickMs);
	lastTickMs = tickT;

	const state = game.getState();
	if (state.phase === 'playing') {
		if (director && !director.isFinished) director.tick(dtMs);
		runtime.civilians.tick(dtMs, CAPSULE_HEIGHT);
		runtime.propAnims.tick();
		runtime.lightTweens.tick(levelHandles, tickT);
		runtime.fireAlarm.tick(levelHandles, tickT, (id) => runtime.lightTweens.isActive(id));
		game.tickReload(now());
		if (currentCamera) runtime.cameraShake.apply(currentCamera);
	}

	// Render-side guard: a gameplay scene built mid-tick (e.g. a level jump
	// that resets `scene` and starts the async `buildLevel`) can be visited
	// by the render loop before primitives have attached their materials.
	// At that point Babylon tries to render meshes whose effects are still
	// compiling, which is harmless but visually jarring (one frame of flat-
	// shaded geometry before PBR kicks in). Holding off the gameplay-scene
	// render until `levelHandles` resolves keeps the uiScene drawing while
	// the level finishes async construction; the gameplay scene catches up
	// on the next tick. The title scene has no async build — its single
	// FreeCamera + clearColor is ready synchronously — so `levelHandles`
	// stays null for it and we let it render via the `title-cam` sentinel.
	const isTitleScene = scene?.activeCamera?.name === 'title-cam';
	if (scene?.activeCamera && !scene.isDisposed && (levelHandles != null || isTitleScene)) {
		scene.render();
	}
	// Composite the GUI on top. `uiScene.autoClear=false` preserves the
	// gameplay framebuffer; this draw lays the ADT over it.
	uiScene.render();
}

// ── Hit-test: reticle hover + fire ───────────────────────────────────────────

function pickAt(xPx: number, yPx: number): PickResult {
	return pickAtImpl(scene, xPx, yPx, CAPSULE_HALF_HEIGHT);
}

function reticleColorFor(pick: PickResult): 'green' | 'orange' | 'red' | 'blue' {
	return reticleColorForImpl(pick, director, enemySpawnHp);
}

// Start.
game.subscribe((state) => {
	if (state.phase === 'playing' && state.run) {
		if (!currentLevel || currentLevel.id !== state.run.currentLevelId) {
			constructLevel(state.run.currentLevelId);
		}
	}
});

reticle.setPosition(window.innerWidth / 2, window.innerHeight / 2);

canvas.addEventListener('pointermove', (e) => {
	reticle.setPosition(e.clientX, e.clientY);
	if (game.getState().phase !== 'playing') return;
	const pick = pickAt(e.clientX, e.clientY);
	reticle.setColor(reticleColorFor(pick));
});
canvas.addEventListener('pointerdown', (e) => {
	if (game.getState().phase !== 'playing' || !director) return;
	const fired = game.tryFire(now());
	if (!fired) return;
	const pick = pickAt(e.clientX, e.clientY);
	// Adaptive difficulty: enemy hits AND deliberate health-kit pickups
	// preserve the hitless-kill streak — both are intentional, useful trigger
	// pulls. Civilian hits and air shots break it (wasted rounds / bad
	// trigger discipline). The director's discount only erodes on actual
	// missed shots, taken damage, or arrival at a new dwell position.
	const shotPreservesStreak = pick.kind === 'enemy' || pick.kind === 'health-kit';
	director.notifyShotResult(shotPreservesStreak);
	if (pick.kind === 'enemy' && pick.enemyId && pick.target) {
		director.hitEnemy(pick.enemyId, pick.target);
	} else if (pick.kind === 'civilian' && pick.civilianId) {
		game.hitCivilian();
		const civ = runtime.civilians.getById(pick.civilianId);
		civ?.mesh.dispose();
		runtime.civilians.deleteById(pick.civilianId);
	} else if (pick.kind === 'health-kit' && pick.healthKitId) {
		const kit = healthKitMeshes.get(pick.healthKitId);
		if (kit) {
			const hp = (kit.metadata as { healthKitHp?: number } | null)?.healthKitHp;
			game.collectHealthKit(hp);
			kit.dispose();
			healthKitMeshes.delete(pick.healthKitId);
			levelHandles?.healthKits.delete(pick.healthKitId);
		}
	}
	if (pick.kind !== 'air' && pick.kind !== 'health-kit') director.emitAlert();
});

canvas.setAttribute('tabindex', '0');
canvas.addEventListener(
	'keydown',
	(e) => {
		if (game.getState().phase !== 'playing') return;
		if (e.repeat) {
			if (e.key === 'Tab') e.preventDefault();
			return;
		}
		if (e.key === 'r' || e.key === 'R') {
			game.reload(now());
			e.preventDefault();
			return;
		}
		if (e.key === 'Tab') {
			game.swapWeapon();
			e.preventDefault();
		}
	},
	{ capture: true },
);
canvas.addEventListener('pointerdown', () => canvas.focus(), { passive: true });

engine.runRenderLoop(tick);
