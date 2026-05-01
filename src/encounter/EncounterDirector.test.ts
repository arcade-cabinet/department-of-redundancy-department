import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, it } from 'vitest';
import type { Cue } from './cues';
import { EncounterDirector, type EncounterListener } from './EncounterDirector';

// Listener that no-ops everything. Director state is what we assert on.
const noopListener: EncounterListener = {
	onCueFire: () => {},
	onEnemySpawn: () => {},
	onEnemyMove: () => {},
	onEnemyHit: () => {},
	onEnemyKill: () => {},
	onEnemyCease: () => {},
	onFireEvent: () => {},
	onPlayerDamage: () => {},
	onCameraUpdate: () => {},
};

const railWithDwell = {
	defaultSpeedUps: 4,
	nodes: [
		{
			id: 'enter',
			kind: 'glide',
			position: new Vector3(0, 1.6, 0),
			lookAt: new Vector3(0, 1.6, 4),
		},
		{
			id: 'pos-1',
			kind: 'combat',
			position: new Vector3(0, 1.6, 5),
			lookAt: new Vector3(0, 1.6, 8),
			dwellMs: 18000,
		},
		{
			id: 'exit',
			kind: 'glide',
			position: new Vector3(0, 1.6, 10),
			lookAt: new Vector3(0, 1.6, 12),
		},
	],
} as const;

describe('EncounterDirector — dwell early-resume gate', () => {
	it('does NOT auto-resume on dwell with no enemy-spawn cues — must wait full dwellMs', () => {
		// A dwell with no on-arrive spawns is a directive-authored "calm
		// beat" — the rail must hold for the full dwellMs even though
		// `currentDwellEnemyIds` is permanently empty. The pre-fix bug
		// would early-resume immediately because `allDwellEnemiesCleared()`
		// returned true on the very first tick after arrival.
		const director = new EncounterDirector({
			cameraRail: railWithDwell,
			cues: [],
			spawnRails: [],
			difficulty: 'normal',
			listener: noopListener,
		});

		// Tick 5s (well past the glide-in but well short of the 18s dwell).
		// Glide enter→pos-1 covers ~5m at default speed 4m/s ≈ 1.25s. After
		// 5s of total ticks, the rail has been dwelling for ~3.75s.
		director.tick(2000);
		director.tick(3000);
		// Camera position should still equal pos-1 (rail held in dwell).
		expect(director.cameraPosition.z).toBeCloseTo(5, 1);
	});

	it('DOES auto-resume after a spawned-then-killed enemy clears', () => {
		// The early-resume contract: spawn fires, enemies are killed by
		// the player, dwell ends early. The `currentDwellHadSpawn` flag
		// must NOT block this legitimate path.
		const cues: Cue[] = [
			{
				id: 'p1-spawn',
				trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
				action: {
					verb: 'enemy-spawn',
					railId: 'r1',
					archetype: 'middle-manager',
					fireProgram: 'pistol-pop-aim',
				},
			},
		];
		const director = new EncounterDirector({
			cameraRail: railWithDwell,
			cues,
			spawnRails: [
				{
					id: 'r1',
					path: [new Vector3(0, 0, 7), new Vector3(0, 0, 8)],
					speed: 2,
					loop: false,
				},
			],
			difficulty: 'normal',
			listener: noopListener,
		});

		// Tick into pos-1; the on-arrive cue fires and adds an enemy.
		director.tick(2000);
		// Find the spawned enemy id (deterministic: middle-manager-0).
		const spawned = director.getEnemy('middle-manager-0');
		expect(spawned).toBeDefined();
		// Pin the contract: BEFORE the kill, camera must hold at pos-1 even
		// after another long tick. If the gate were broken, the camera
		// would have already advanced because `currentDwellEnemyIds` was
		// briefly empty between arrival and the spawn cue firing.
		director.tick(2000);
		expect(director.cameraPosition.z).toBeCloseTo(5, 1);

		// Headshot it dead in one tap (250 head damage vs 60 base hp).
		director.hitEnemy('middle-manager-0', 'head');
		// Next tick — early-resume sets phase back to gliding. A subsequent
		// tick advances the camera along the resumed segment.
		director.tick(16);
		director.tick(500);
		// Camera should now be past pos-1 (resumed glide toward exit).
		expect(director.cameraPosition.z).toBeGreaterThan(5);
	});
});
