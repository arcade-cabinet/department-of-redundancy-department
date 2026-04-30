import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Loading/sceneLoader';

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
import type { LevelId } from './levels/types';
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
	}
	currentLevel = getLevel(levelId);
	scene = new Scene(engine);

	const camera = new FreeCamera('camera', new Vector3(0, 1.6, 0), scene);
	camera.minZ = 0.05;
	camera.fov = 1.2; // ~70°
	scene.activeCamera = camera;

	new HemisphericLight('amb', new Vector3(0, 1, 0), scene);

	// Placeholder floor so the camera has a frame of reference.
	const floor = MeshBuilder.CreateGround('floor', { width: 30, height: 30 }, scene);
	floor.position.set(0, 0, 12);
	floor.checkCollisions = false;

	const listener: EncounterListener = {
		onCueFire(cue: Cue, action: CueAction) {
			console.debug('[cue]', cue.id, action.verb);
			if (action.verb === 'transition') {
				constructLevel(action.toLevelId);
				game.transitionLevel(action.toLevelId);
			}
		},
		onEnemySpawn(enemy: Enemy) {
			if (!scene) return;
			// Visual: a small sphere at the enemy's spawn-rail position.
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
