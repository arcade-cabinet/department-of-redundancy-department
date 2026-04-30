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
			// Placeholder enemy visual — a sphere. Replaced when archetype GLBs are wired.
			const mesh = MeshBuilder.CreateSphere(`enemy-${enemy.id}`, { diameter: 0.8 }, scene);
			mesh.position.copyFrom(enemy.position);
			mesh.metadata = { enemyId: enemy.id };
		},
		onEnemyHit(enemyId, target, damage) {
			console.debug('[hit]', enemyId, target, damage);
		},
		onEnemyKill(enemyId) {
			const mesh = scene?.getMeshByName(`enemy-${enemyId}`);
			mesh?.dispose();
			game.hit('body'); // record kill in game state
		},
		onEnemyCease(enemyId) {
			const mesh = scene?.getMeshByName(`enemy-${enemyId}`);
			mesh?.dispose();
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
		// audio-stinger / ambience-fade / narrator / civilian-spawn / prop-anim / boss-spawn
		// are handled by their respective subsystems in subsequent commits.
		default:
			return;
	}
}

// ── Main loop ────────────────────────────────────────────────────────────────

function tick(): void {
	const now = performance.now();
	const dtMs = Math.min(64, now - lastTickMs); // cap at 64ms (16fps floor) to avoid huge dt
	lastTickMs = now;

	const state = game.getState();
	if (state.phase === 'playing' && director && !director.isFinished) {
		director.tick(dtMs);
	}

	scene?.render();
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
});
canvas.addEventListener('pointerdown', () => {
	director?.emitAlert();
});

engine.runRenderLoop(tick);
