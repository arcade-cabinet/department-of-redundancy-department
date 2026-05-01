import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/core/Audio/audioEngine';
import '@babylonjs/loaders/glTF';

import { AudioBus } from './audio/AudioBus';
import {
	type Cue,
	type CueAction,
	EncounterDirector,
	type EncounterListener,
	type Enemy,
	type FireEvent,
} from './encounter';
import { now } from './engine/clock';
import { rand } from './engine/rng';
import { Game } from './game/Game';
import type { GameState } from './game/GameState';
import {
	ContinueOverlay,
	DifficultySelectOverlay,
	GameOverOverlay,
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
	loadSettings,
	loadUnlockedDifficulties,
	type Settings,
	saveHighScoreIfBetter,
	saveSettings,
} from './preferences';

/**
 * src/main.ts — runtime boot.
 *
 * Owns: Babylon Engine, Scene, current Level, EncounterDirector, GUI overlays,
 * Game state machine. Ticks once per frame. Listens to game state changes to
 * swap overlays, handles input, dispatches director events to the world.
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
let scene: Scene | null = null;
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

const game = new Game();
const overlay = new Overlay('dord-ui');
const reticle = new Reticle(overlay);

let activeOverlayDispose: (() => void) | null = null;
let hud: HudOverlay | null = null;
let narrator: NarratorOverlay | null = null;
// Bumped on every routeOverlay call so stale async overlay constructors no-op.
let overlayRouteToken = 0;
let lastTickMs = performance.now();

const settings: Settings = await loadSettings();

window.addEventListener('resize', () => engine.resize());
document.addEventListener('visibilitychange', () => {
	// Pause/resume when tab loses/gains focus. No Capacitor app lifecycle.
	if (document.hidden) {
		// Pause via stopping render loop is the simplest approach.
		engine.stopRenderLoop();
	} else {
		engine.runRenderLoop(tick);
	}
});

// ── Game state → overlay routing ─────────────────────────────────────────────

game.subscribe((state) => routeOverlay(state));

function routeOverlay(state: GameState): void {
	const token = ++overlayRouteToken;
	if (activeOverlayDispose) {
		activeOverlayDispose();
		activeOverlayDispose = null;
	}
	const wantsHud = state.phase === 'playing' || state.phase === 'continue-prompt';
	if (wantsHud && !hud) {
		hud = new HudOverlay(overlay);
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
			const coin = new InsertCoinOverlay(overlay, () => game.insertCoin());
			activeOverlayDispose = () => coin.dispose();
			break;
		}
		case 'difficulty-select': {
			void loadUnlockedDifficulties().then((unlocked) => {
				if (token !== overlayRouteToken) return;
				if (game.getState().phase !== 'difficulty-select') return;
				const picker = new DifficultySelectOverlay(overlay, unlocked, (difficulty, lives) => {
					game.chooseDifficulty(difficulty, lives, 'standard', now());
				});
				activeOverlayDispose = () => picker.dispose();
			});
			break;
		}
		case 'playing': {
			// HUD already mounted above; nothing else to do here.
			break;
		}
		case 'continue-prompt': {
			const cont = new ContinueOverlay(
				overlay,
				() => game.continueRun(),
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

async function emitGameOver(state: GameState, score: number, cleared: boolean): Promise<void> {
	const run = state.run;
	if (!run) return;
	const utcDate = new Date().toISOString().slice(0, 10);
	const newHighScore = await saveHighScoreIfBetter({
		score,
		difficulty: run.difficulty,
		lives: run.lives,
		clearedRun: cleared,
		utcDate,
	});
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
		game.insertCoin();
	});
	activeOverlayDispose = () => overlayInstance.dispose(overlay);
	void loadHighScore(); // pre-warm cache for next coin
}

// ── Level construction (minimal v1 — no PBR materials, no GLB props yet) ────

function constructLevel(levelId: LevelId): void {
	if (scene) {
		scene.dispose();
		scene = null;
		currentCamera = null;
		cameraShake = null;
		lastShakeDx = 0;
		lastShakeDy = 0;
		levelHandles = null;
		audioBus = null;
		enemySpawnHp.clear();
		enemyLastHitTarget.clear();
		enemyMeshes.clear();
		activeCivilians.clear();
		civilianSeq = 0;
		activePropAnims.clear();
	}
	currentLevel = getLevel(levelId);
	scene = new Scene(engine);
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
		if (scene === builtScene) levelHandles = handles;
	});

	const listener: EncounterListener = {
		onCueFire(cue: Cue, action: CueAction) {
			console.debug('[cue]', cue.id, action.verb);
			handleCueAction(action);
		},
		onEnemySpawn(enemy: Enemy) {
			if (!scene) return;
			// Placeholder enemy visual — a capsule, taller than wide so head vs body
			// raycasts have a meaningful split. Replaced when archetype GLBs are wired.
			const mesh = MeshBuilder.CreateCapsule(
				`enemy-${enemy.id}`,
				{ radius: CAPSULE_RADIUS, height: CAPSULE_HEIGHT },
				scene,
			);
			mesh.position.copyFrom(enemy.position);
			mesh.position.y += CAPSULE_HALF_HEIGHT;
			mesh.metadata = { enemyId: enemy.id };
			enemySpawnHp.set(enemy.id, enemy.hp);
			enemyMeshes.set(enemy.id, mesh);
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
		},
		onEnemyCease(enemyId) {
			disposeEnemy(enemyId);
			enemyLastHitTarget.delete(enemyId);
		},
		onFireEvent(_enemyId, event: FireEvent) {
			void event;
		},
		onPlayerDamage(damage) {
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
		difficulty: settings.difficulty,
		listener,
	});
}

function handleCueAction(action: CueAction): void {
	switch (action.verb) {
		case 'transition':
			constructLevel(action.toLevelId);
			game.transitionLevel(action.toLevelId);
			return;
		case 'door':
			handleDoorCue(action.doorId, action.to);
			return;
		case 'lighting': {
			const light = levelHandles?.lights.get(action.lightId);
			if (!light) return;
			if (action.tween.kind === 'snap') light.intensity = action.tween.intensity;
			// fade/oscillate handled in a later commit when we wire animations
			return;
		}
		case 'civilian-spawn': {
			spawnCivilian(action.railId);
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
			beginCameraShake(action.intensity, action.durationMs);
			return;
		}
		case 'shutter':
			handleShutterCue(action.shutterId, action.to);
			return;
		case 'level-event':
			handleLevelEvent(action.event);
			return;
		case 'prop-anim':
			handlePropAnimCue(action.propId, action.animId);
			return;
		// boss-spawn / boss-phase / enemy-spawn are handled by the director
		// itself (see EncounterDirector.fireCue) — they don't reach this
		// listener-side switch.
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
	if (event === 'power-out') {
		for (const light of levelHandles.lights.values()) light.intensity = 0;
		return;
	}
	if (event === 'lights-restored') {
		for (const prim of currentLevel.primitives) {
			if (prim.kind !== 'light') continue;
			const lightPrim = prim as Light;
			const bl = levelHandles.lights.get(lightPrim.id);
			if (bl) bl.intensity = lightPrim.intensity;
		}
		return;
	}
	// fire-alarm + elevator-ding are pure audio cues — emitted via separate
	// audio-stinger cues in the level data. No render side-effect here.
}

// ── Camera shake ─────────────────────────────────────────────────────────────
// Decaying random per-axis offset added to the camera's authored rail position
// each tick. Owned by main.ts so cues from any director can drive it.

interface CameraShake {
	readonly intensity: number;
	readonly startMs: number;
	readonly endMs: number;
}
let cameraShake: CameraShake | null = null;
// Previously-applied shake offset. Undone at the start of each apply so the
// camera's authoritative rail position is restored before adding the new
// offset — guards against frames where the director did not write a fresh
// onCameraUpdate (e.g., director.isFinished).
let lastShakeDx = 0;
let lastShakeDy = 0;

function beginCameraShake(intensity: number, durationMs: number): void {
	const startMs = now();
	cameraShake = { intensity, startMs, endMs: startMs + durationMs };
}

function applyCameraShake(camera: FreeCamera): void {
	camera.position.x -= lastShakeDx;
	camera.position.y -= lastShakeDy;
	lastShakeDx = 0;
	lastShakeDy = 0;
	if (!cameraShake) return;
	const t0 = now();
	if (t0 >= cameraShake.endMs) {
		cameraShake = null;
		return;
	}
	const totalMs = cameraShake.endMs - cameraShake.startMs;
	const remainingMs = cameraShake.endMs - t0;
	const t = totalMs > 0 ? remainingMs / totalMs : 0;
	const amp = cameraShake.intensity * t;
	lastShakeDx = (rand() - 0.5) * 2 * amp;
	lastShakeDy = (rand() - 0.5) * 2 * amp;
	camera.position.x += lastShakeDx;
	camera.position.y += lastShakeDy;
}

function disposeEnemy(enemyId: string): void {
	const mesh = enemyMeshes.get(enemyId);
	mesh?.dispose();
	enemyMeshes.delete(enemyId);
	enemySpawnHp.delete(enemyId);
}

// ── Prop animations ──────────────────────────────────────────────────────────
// Three authored animIds drive prop-anim cues across lobby + open-plan:
// drop (clipboard falls to floor), roll-in (printer-dolly slides in along
// prop yaw), shatter (mug disappears). Each is a per-frame tween over a fixed
// duration. Stored in a Map and ticked alongside civilians.

interface ActivePropAnim {
	readonly mesh: AbstractMesh;
	readonly startMs: number;
	readonly durationMs: number;
	readonly animId: 'drop' | 'roll-in';
	readonly fromX: number;
	readonly fromY: number;
	readonly fromZ: number;
	readonly toX: number;
	readonly toY: number;
	readonly toZ: number;
	readonly fromRotZ: number;
	readonly toRotZ: number;
}

const activePropAnims = new Map<string, ActivePropAnim>();

function handlePropAnimCue(propId: string, animId: string): void {
	const mesh = levelHandles?.props.get(propId);
	if (!mesh || mesh.isDisposed()) return;
	// Re-entrancy guard: if a prop is mid-animation, drop the second cue. The
	// authored prop position is captured at construction time; firing a new
	// roll-in while the mesh is offset would corrupt the destination capture.
	if (activePropAnims.has(propId)) return;
	if (animId === 'shatter') {
		mesh.dispose();
		levelHandles?.props.delete(propId);
		return;
	}
	if (animId === 'drop') {
		activePropAnims.set(propId, {
			mesh,
			startMs: now(),
			durationMs: 600,
			animId: 'drop',
			fromX: mesh.position.x,
			fromY: mesh.position.y,
			fromZ: mesh.position.z,
			toX: mesh.position.x,
			toY: 0,
			toZ: mesh.position.z,
			fromRotZ: mesh.rotation.z,
			toRotZ: mesh.rotation.z + Math.PI / 6,
		});
		return;
	}
	if (animId === 'roll-in') {
		const yaw = mesh.rotation.y;
		const rollDist = 3;
		const destX = mesh.position.x;
		const destZ = mesh.position.z;
		activePropAnims.set(propId, {
			mesh,
			startMs: now(),
			durationMs: 800,
			animId: 'roll-in',
			fromX: destX - Math.sin(yaw) * rollDist,
			fromY: mesh.position.y,
			fromZ: destZ - Math.cos(yaw) * rollDist,
			toX: destX,
			toY: mesh.position.y,
			toZ: destZ,
			fromRotZ: mesh.rotation.z,
			toRotZ: mesh.rotation.z,
		});
		// Snap to start position so the tween rolls in from offscreen.
		mesh.position.x = destX - Math.sin(yaw) * rollDist;
		mesh.position.z = destZ - Math.cos(yaw) * rollDist;
		return;
	}
	console.warn(`[cue] unknown prop-anim animId '${animId}' for prop '${propId}'`);
}

function tickPropAnims(): void {
	const t0 = now();
	for (const [id, anim] of activePropAnims) {
		const elapsed = t0 - anim.startMs;
		const t = Math.min(1, elapsed / anim.durationMs);
		const eased = anim.animId === 'drop' ? t * t : 1 - (1 - t) * (1 - t);
		anim.mesh.position.x = anim.fromX + (anim.toX - anim.fromX) * eased;
		anim.mesh.position.y = anim.fromY + (anim.toY - anim.fromY) * eased;
		anim.mesh.position.z = anim.fromZ + (anim.toZ - anim.fromZ) * eased;
		anim.mesh.rotation.z = anim.fromRotZ + (anim.toRotZ - anim.fromRotZ) * eased;
		if (t >= 1) activePropAnims.delete(id);
	}
}

// ── Civilians ────────────────────────────────────────────────────────────────
// Civilians are placeholder cyan capsules that lerp along their authored path.
// They're not director-tracked — main.ts owns their lifecycle and ticks them.

interface ActiveCivilian {
	readonly id: string;
	readonly path: readonly Vector3[];
	readonly speed: number;
	readonly mesh: AbstractMesh;
	t: number; // arc-length traveled, meters
}

const activeCivilians = new Map<string, ActiveCivilian>();
let civilianSeq = 0;

function spawnCivilian(railId: string): void {
	if (!scene || !currentLevel) return;
	const rail = currentLevel.civilianRails.find((r) => r.id === railId);
	const head = rail?.path[0];
	if (!rail || !head || rail.path.length < 2) return;
	const id = `civ-${++civilianSeq}`;
	const mesh = MeshBuilder.CreateCapsule(
		`civilian-${id}`,
		{ radius: CAPSULE_RADIUS, height: CAPSULE_HEIGHT },
		scene,
	);
	mesh.position.copyFrom(head);
	mesh.position.y += CAPSULE_HALF_HEIGHT;
	mesh.metadata = { civilianId: id };
	activeCivilians.set(id, { id, path: rail.path, speed: rail.speed, mesh, t: 0 });
}

function tickCivilians(dtMs: number): void {
	const dtS = dtMs / 1000;
	for (const civ of activeCivilians.values()) {
		civ.t += civ.speed * dtS;
		const { position, finished } = sampleCivilianPath(civ);
		civ.mesh.position.copyFrom(position);
		civ.mesh.position.y += CAPSULE_HALF_HEIGHT;
		if (finished) {
			civ.mesh.dispose();
			activeCivilians.delete(civ.id);
		}
	}
}

function sampleCivilianPath(civ: ActiveCivilian): { position: Vector3; finished: boolean } {
	let remaining = civ.t;
	let last: Vector3 | undefined;
	for (let i = 0; i < civ.path.length - 1; i++) {
		const a = civ.path[i];
		const b = civ.path[i + 1];
		if (!a || !b) break;
		last = b;
		const seg = Vector3.Distance(a, b);
		if (remaining <= seg) {
			const u = seg > 0 ? remaining / seg : 0;
			return { position: Vector3.Lerp(a, b, u), finished: false };
		}
		remaining -= seg;
	}
	return { position: last ?? civ.path[0] ?? Vector3.Zero(), finished: true };
}

// ── Main loop ────────────────────────────────────────────────────────────────

function tick(): void {
	const tickT = performance.now();
	const dtMs = Math.min(64, tickT - lastTickMs); // cap at 64ms (16fps floor) to avoid huge dt
	lastTickMs = tickT;

	const state = game.getState();
	if (state.phase === 'playing') {
		if (director && !director.isFinished) director.tick(dtMs);
		tickCivilians(dtMs);
		tickPropAnims();
		game.tickReload(now());
		if (currentCamera) applyCameraShake(currentCamera);
	}

	scene?.render();
}

// ── Hit-test: reticle hover + fire ───────────────────────────────────────────

interface PickResult {
	readonly kind: 'enemy' | 'civilian' | 'air';
	readonly enemyId?: string;
	readonly civilianId?: string;
	readonly target?: 'head' | 'body';
}

function pickAt(xPx: number, yPx: number): PickResult {
	if (!scene) return { kind: 'air' };
	const pick = scene.pick(xPx, yPx);
	if (!pick?.hit || !pick.pickedMesh) return { kind: 'air' };
	const meta = pick.pickedMesh.metadata as
		| { enemyId?: string; civilianId?: string }
		| null
		| undefined;
	if (meta?.enemyId) {
		// Headshot if the picked point is in the top quarter of the capsule.
		const meshY = pick.pickedMesh.position.y;
		const hitY = pick.pickedPoint?.y ?? meshY;
		const fromTop = meshY + CAPSULE_HALF_HEIGHT - hitY;
		const target: 'head' | 'body' = fromTop < CAPSULE_HALF_HEIGHT * 0.5 ? 'head' : 'body';
		return { kind: 'enemy', enemyId: meta.enemyId, target };
	}
	if (meta?.civilianId) {
		return { kind: 'civilian', civilianId: meta.civilianId };
	}
	return { kind: 'air' };
}

function reticleColorFor(pick: PickResult): 'green' | 'orange' | 'red' | 'blue' {
	if (pick.kind === 'civilian') return 'blue';
	if (pick.kind !== 'enemy' || !pick.enemyId || !director) return 'green';
	const enemy = director.getEnemy(pick.enemyId);
	const spawn = enemySpawnHp.get(pick.enemyId);
	if (!enemy || !spawn || spawn <= 0) return 'green';
	const frac = enemy.hp / spawn;
	// Reticle gradient maps to "how dangerous is this thing right now" — full
	// HP is red (commit), mid is orange, low is green-ish-armed. Spec says
	// green→orange→red as the windup advances. For a hover baseline we treat
	// the highest-HP enemy as the most-active threat: red when fresh, orange
	// at half, green-armed near death.
	if (frac > 0.66) return 'red';
	if (frac > 0.33) return 'orange';
	return 'green';
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
	// Pull the trigger first — gates target resolution on having a real shot.
	const fired = game.tryFire(now());
	if (!fired) return; // reloading or dry-pulled (auto-reload triggered)
	const pick = pickAt(e.clientX, e.clientY);
	if (pick.kind === 'enemy' && pick.enemyId && pick.target) {
		director.hitEnemy(pick.enemyId, pick.target);
	} else if (pick.kind === 'civilian' && pick.civilianId) {
		game.hitCivilian();
		const civ = activeCivilians.get(pick.civilianId);
		civ?.mesh.dispose();
		activeCivilians.delete(pick.civilianId);
	}
	// Any actual shot — at an enemy or a civilian — wakes pre-aggro enemies.
	if (pick.kind !== 'air') director.emitAlert();
});

// Canvas needs tabindex to receive focus + keydown directly. Capture-phase
// listener so e.preventDefault() suppresses Tab focus-cycling before the
// browser processes it (window-level handlers are too late on Firefox).
canvas.setAttribute('tabindex', '0');
canvas.addEventListener(
	'keydown',
	(e) => {
		if (game.getState().phase !== 'playing') return;
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
// Focus the canvas on first pointer interaction so keys reach it.
canvas.addEventListener('pointerdown', () => canvas.focus(), { passive: true });

engine.runRenderLoop(tick);
