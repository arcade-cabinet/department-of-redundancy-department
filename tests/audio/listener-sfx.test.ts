import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Scene } from '@babylonjs/core/scene';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CueAction, Enemy, FireEvent } from '../../src/encounter';
import type { Game } from '../../src/game/Game';
import {
	createEncounterListener,
	type EncounterListenerHost,
} from '../../src/runtime/levelLifecycle';

/**
 * Pin every SFX cue wired into the EncounterListener to its asset path +
 * trigger condition. This protects A.10's audio contract from silent
 * regressions — if a refactor moves a `host.playSfx` call out of the
 * listener, the affected test fails.
 *
 * We don't go through `AudioBus` here — that's covered separately. The
 * boundary under test is "listener emits the right `playSfx` calls in
 * response to director events." The listener's other side-effects (mesh
 * creation, Map writes) come along for the ride; we ignore them.
 */

interface SfxRecord {
	readonly audioFile: string;
	readonly volume: number | undefined;
}

function makeHost(scene: Scene, camera: FreeCamera, sfx: SfxRecord[]): EncounterListenerHost {
	const noopGame = {
		hit: () => {},
		takeDamage: () => {},
	} as unknown as Game;
	return {
		capsuleHeight: 1.6,
		capsuleRadius: 0.35,
		enemyMeshes: new Map<string, AbstractMesh>(),
		enemySpawnHp: new Map<string, number>(),
		enemyLastHitTarget: new Map<string, 'head' | 'body' | 'justice'>(),
		enemyGlintMeshes: new Map<string, AbstractMesh>(),
		game: noopGame,
		camera,
		getScene: () => scene,
		disposeEnemy: () => {},
		handleCueAction: (_action: CueAction) => {},
		applyDamage: () => {},
		playSfx: (audioFile, volume) => sfx.push({ audioFile, volume }),
		loseCivilianOnRail: () => {},
	};
}

function makeEnemy(overrides: Partial<Enemy> = {}): Enemy {
	return {
		id: 'middle-manager-0',
		archetypeId: 'middle-manager',
		fireProgramId: 'pistol-pop-aim',
		rail: { graph: { id: 'r', path: [], speed: 1, loop: false }, distance: 0, atEnd: false },
		elapsedMs: 0,
		nextFireEventIdx: 0,
		hp: 60,
		state: 'sliding',
		position: new Vector3(0, 0, 0),
		ceaseAfterMs: null,
		alerted: false,
		...overrides,
	} as Enemy;
}

let engine: NullEngine;
let scene: Scene;
let camera: FreeCamera;

beforeEach(() => {
	engine = new NullEngine();
	scene = new Scene(engine);
	camera = new FreeCamera('cam', new Vector3(0, 1.6, 0), scene);
});

afterEach(() => {
	scene.dispose();
	engine.dispose();
});

describe('EncounterListener SFX wiring', () => {
	it('plays boss-roar on boss enemy spawn — reaper gets the explosion sample', () => {
		const sfx: SfxRecord[] = [];
		const listener = createEncounterListener(makeHost(scene, camera, sfx));
		listener.onEnemySpawn(
			makeEnemy({ id: 'boss-reaper', archetypeId: 'reaper', fireProgramId: 'idle' }),
		);
		expect(sfx[0]?.audioFile).toBe('explosion/explosion-big-01.mp3');
	});

	it('plays boss-roar on mini-boss spawn — bright-stinger sample', () => {
		const sfx: SfxRecord[] = [];
		const listener = createEncounterListener(makeHost(scene, camera, sfx));
		listener.onEnemySpawn(
			makeEnemy({ id: 'boss-garrison', archetypeId: 'security-guard', fireProgramId: 'idle' }),
		);
		expect(sfx[0]?.audioFile).toBe('stinger/stinger-bright.mp3');
	});

	it('does NOT play boss-roar on rank-and-file spawn', () => {
		const sfx: SfxRecord[] = [];
		const listener = createEncounterListener(makeHost(scene, camera, sfx));
		listener.onEnemySpawn(makeEnemy());
		// Rank-and-file may add a glint mesh, but the boss-roar SFX must be
		// absent. (No SFX at all is the correct outcome — spawn isn't itself
		// a beat the player should hear in the curated mix.)
		expect(sfx).toHaveLength(0);
	});

	it('plays heavy-impact on head-hit-confirm and body-impact on body-hit-confirm', () => {
		const sfx: SfxRecord[] = [];
		const listener = createEncounterListener(makeHost(scene, camera, sfx));
		listener.onEnemyHit('e1', 'head', 250);
		listener.onEnemyHit('e2', 'body', 100);
		expect(sfx[0]?.audioFile).toBe('impact/impact-heavy-01.ogg');
		expect(sfx[1]?.audioFile).toBe('impact/impact-body-01.ogg');
	});

	it('plays explosion-debris on boss kill, heavy-impact on rank-and-file kill', () => {
		const sfx: SfxRecord[] = [];
		const listener = createEncounterListener(makeHost(scene, camera, sfx));
		listener.onEnemyKill('boss-garrison');
		listener.onEnemyKill('middle-manager-0');
		expect(sfx[0]?.audioFile).toBe('explosion/explosion-debris.mp3');
		expect(sfx[1]?.audioFile).toBe('impact/impact-heavy-02.ogg');
	});

	it('emits no spurious SFX on onFireEvent (the listener only reads it for glint toggles)', () => {
		const sfx: SfxRecord[] = [];
		const listener = createEncounterListener(makeHost(scene, camera, sfx));
		const aimEvent: FireEvent = { atMs: 300, verb: 'aim-laser', durationMs: 300 };
		listener.onFireEvent('e1', aimEvent);
		expect(sfx).toHaveLength(0);
	});
});
