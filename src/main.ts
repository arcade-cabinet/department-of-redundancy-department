import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';

import {
	type Cue,
	type CueAction,
	EncounterDirector,
	type EncounterListener,
	type Enemy,
	type FireEvent,
} from './encounter';
import { Game } from './game/Game';
import type { GameState } from './game/GameState';
import {
	ContinueOverlay,
	GameOverOverlay,
	InsertCoinOverlay,
	Overlay,
	Reticle,
	SettingsOverlay,
} from './gui';
import { getLevel, type Level } from './levels';
import { applyDoorOpen, buildLevel, type LevelHandles } from './levels/build';
import type { Door, LevelId } from './levels/types';
import {
	loadHighScore,
	loadSettings,
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

const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false });
let scene: Scene | null = null;
let director: EncounterDirector | null = null;
let currentLevel: Level | null = null;
let levelHandles: LevelHandles | null = null;

// Per-enemy bookkeeping for the reticle gradient and kill scoring.
const enemySpawnHp = new Map<string, number>();
const enemyLastHitTarget = new Map<string, 'head' | 'body' | 'justice'>();

const game = new Game();
const overlay = new Overlay('dord-ui');
const reticle = new Reticle(overlay);

let activeOverlayDispose: (() => void) | null = null;
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
	if (activeOverlayDispose) {
		activeOverlayDispose();
		activeOverlayDispose = null;
	}
	switch (state.phase) {
		case 'insert-coin': {
			const coin = new InsertCoinOverlay(overlay, () => game.insertCoin());
			activeOverlayDispose = () => coin.dispose();
			break;
		}
		case 'difficulty-select': {
			// Default: jump straight to N-3 if no UI built yet.
			game.chooseDifficulty('normal', 'three-lives');
			break;
		}
		case 'playing': {
			// HUD only; reticle is global.
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
		elapsedMs: performance.now() - run.startedAtMs,
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
		levelHandles = null;
		enemySpawnHp.clear();
		enemyLastHitTarget.clear();
		activeCivilians.clear();
		civilianSeq = 0;
	}
	currentLevel = getLevel(levelId);
	scene = new Scene(engine);

	const camera = new FreeCamera('camera', new Vector3(0, 1.6, 0), scene);
	camera.minZ = 0.05;
	camera.fov = 1.2; // ~70°
	scene.activeCamera = camera;

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
				{ radius: 0.35, height: 1.8 },
				scene,
			);
			mesh.position.copyFrom(enemy.position);
			mesh.position.y += 0.9; // capsule center; feet at enemy.position.y
			mesh.metadata = { enemyId: enemy.id };
			enemySpawnHp.set(enemy.id, enemy.hp);
		},
		onEnemyHit(enemyId, target, _damage) {
			enemyLastHitTarget.set(enemyId, target);
		},
		onEnemyKill(enemyId) {
			const mesh = scene?.getMeshByName(`enemy-${enemyId}`);
			mesh?.dispose();
			const target = enemyLastHitTarget.get(enemyId) ?? 'body';
			game.hit(target);
			enemySpawnHp.delete(enemyId);
			enemyLastHitTarget.delete(enemyId);
		},
		onEnemyCease(enemyId) {
			const mesh = scene?.getMeshByName(`enemy-${enemyId}`);
			mesh?.dispose();
			enemySpawnHp.delete(enemyId);
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
		case 'door': {
			const mesh = levelHandles?.doors.get(action.doorId);
			if (!mesh || !currentLevel) return;
			const doorPrim = currentLevel.primitives.find(
				(p): p is Door => p.kind === 'door' && p.id === action.doorId,
			);
			if (doorPrim && action.to === 'open') applyDoorOpen(mesh, doorPrim);
			return;
		}
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
		// audio-stinger / ambience-fade / narrator / prop-anim / boss-spawn
		// are handled by their respective subsystems in subsequent commits.
		default:
			return;
	}
}

// ── Civilians ────────────────────────────────────────────────────────────────
// Civilians are placeholder cyan capsules that lerp along their authored path.
// They're not director-tracked — main.ts owns their lifecycle and ticks them.

interface ActiveCivilian {
	readonly id: string;
	readonly path: readonly Vector3[];
	readonly speed: number;
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
	const mesh = MeshBuilder.CreateCapsule(`civilian-${id}`, { radius: 0.35, height: 1.8 }, scene);
	mesh.position.copyFrom(head);
	mesh.position.y += 0.9;
	mesh.metadata = { civilianId: id };
	activeCivilians.set(id, { id, path: rail.path, speed: rail.speed, t: 0 });
}

function tickCivilians(dtMs: number): void {
	if (!scene) return;
	const dtS = dtMs / 1000;
	for (const civ of activeCivilians.values()) {
		civ.t += civ.speed * dtS;
		const { position, finished } = sampleCivilianPath(civ);
		const mesh = scene.getMeshByName(`civilian-${civ.id}`);
		if (mesh) {
			mesh.position.x = position.x;
			mesh.position.y = position.y + 0.9;
			mesh.position.z = position.z;
		}
		if (finished) {
			mesh?.dispose();
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
	const now = performance.now();
	const dtMs = Math.min(64, now - lastTickMs); // cap at 64ms (16fps floor) to avoid huge dt
	lastTickMs = now;

	const state = game.getState();
	if (state.phase === 'playing' && director && !director.isFinished) {
		director.tick(dtMs);
		tickCivilians(dtMs);
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
		const halfH = 0.9; // capsule half-height
		const hitY = pick.pickedPoint?.y ?? meshY;
		const fromTop = meshY + halfH - hitY;
		const target: 'head' | 'body' = fromTop < halfH * 0.5 ? 'head' : 'body';
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
	const pick = pickAt(e.clientX, e.clientY);
	if (pick.kind === 'enemy' && pick.enemyId && pick.target) {
		director.hitEnemy(pick.enemyId, pick.target);
		// Wake up dwell-locked enemies on first shot, mirroring the on-alert
		// pre-aggro semantics for dumb-prop enemies.
		director.emitAlert();
	} else if (pick.kind === 'civilian') {
		game.hitCivilian();
		const mesh = pick.civilianId ? scene?.getMeshByName(`civilian-${pick.civilianId}`) : null;
		mesh?.dispose();
		if (pick.civilianId) activeCivilians.delete(pick.civilianId);
	}
	// Air shots are no-ops (no ammo cost yet — wired in reload slice).
});

engine.runRenderLoop(tick);
