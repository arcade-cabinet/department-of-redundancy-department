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

describe('EncounterDirector — boss phase HP escalation', () => {
	function bossSetup() {
		const cueFires: Array<{ id: string; verb: string; phase?: number }> = [];
		const listener: EncounterListener = {
			...noopListener,
			onCueFire: (cue, action) => {
				if (action.verb === 'boss-phase') {
					cueFires.push({ id: cue.id, verb: action.verb, phase: action.phase });
				} else {
					cueFires.push({ id: cue.id, verb: action.verb });
				}
			},
		};
		const cues: Cue[] = [
			{
				id: 'spawn-garrison',
				trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
				action: { verb: 'boss-spawn', bossId: 'garrison', phase: 1 },
			},
		];
		const director = new EncounterDirector({
			cameraRail: railWithDwell,
			cues,
			spawnRails: [
				{
					id: 'rail-spawn-elevator-garrison',
					path: [new Vector3(0, 0, 7), new Vector3(0, 0, 8)],
					speed: 2,
					loop: false,
				},
			],
			difficulty: 'normal',
			listener,
		});
		return { director, cueFires };
	}

	it('auto-emits boss-phase cue when mini-boss HP drops below 50% threshold', () => {
		const { director, cueFires } = bossSetup();
		// Tick into pos-1 — the on-arrive cue spawns Garrison at phase 1.
		director.tick(2000);
		const boss = director.getEnemy('boss-garrison');
		if (!boss) throw new Error('expected boss-garrison alive after tick');
		// security-guard headDamage. Hammer the boss until just past 50% HP
		// — the auto-emitter must fire EXACTLY ONCE for phase 2.
		const startHp = boss.hp;
		const halfHp = startHp * 0.5;
		while ((director.getEnemy('boss-garrison')?.hp ?? 0) > halfHp) {
			director.hitEnemy('boss-garrison', 'head');
		}
		const phaseFires = cueFires.filter((f) => f.verb === 'boss-phase');
		expect(phaseFires.length).toBe(1);
		expect(phaseFires[0]?.phase).toBe(2);
	});

	it('does not re-emit boss-phase on subsequent below-threshold hits', () => {
		const { director, cueFires } = bossSetup();
		director.tick(2000);
		const boss = director.getEnemy('boss-garrison');
		if (!boss) throw new Error('expected boss-garrison alive');
		const halfHp = boss.hp * 0.5;
		while ((director.getEnemy('boss-garrison')?.hp ?? 0) > halfHp) {
			director.hitEnemy('boss-garrison', 'head');
		}
		// Five more hits past the threshold — emitter must not re-fire.
		for (let i = 0; i < 5; i++) {
			if (!director.getEnemy('boss-garrison')) break;
			director.hitEnemy('boss-garrison', 'head');
		}
		expect(cueFires.filter((f) => f.verb === 'boss-phase').length).toBe(1);
	});

	it('does not double-fire setBossPhase when level authors a boss-phase cue AND HP crosses threshold', () => {
		// Regression for review finding on f69a7ba: if a level authors its own
		// `boss-phase` cue (e.g. on-arrive at a node), `setBossPhase` must
		// stamp the auto-emit key so a later HP-threshold crossing won't fire
		// `setBossPhase` a second time and reset the fire-program cursor +
		// erase damage taken during the transition window.
		const cueFires: Array<{ id: string; verb: string; phase?: number }> = [];
		const listener: EncounterListener = {
			...noopListener,
			onCueFire: (cue, action) => {
				if (action.verb === 'boss-phase') {
					cueFires.push({ id: cue.id, verb: action.verb, phase: action.phase });
				}
			},
		};
		const cues: Cue[] = [
			{
				id: 'spawn-garrison',
				trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
				action: { verb: 'boss-spawn', bossId: 'garrison', phase: 1 },
			},
			{
				id: 'authored-phase-2',
				trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
				action: { verb: 'boss-phase', bossId: 'garrison', phase: 2 },
			},
		];
		const director = new EncounterDirector({
			cameraRail: railWithDwell,
			cues,
			spawnRails: [
				{
					id: 'rail-spawn-elevator-garrison',
					path: [new Vector3(0, 0, 7), new Vector3(0, 0, 8)],
					speed: 2,
					loop: false,
				},
			],
			difficulty: 'normal',
			listener,
		});
		// Tick into pos-1 — both cues fire on the SAME on-arrive: spawn at
		// phase 1 and immediately authored boss-phase to 2.
		director.tick(2000);
		const initial = cueFires.filter((f) => f.verb === 'boss-phase').length;
		expect(initial).toBe(1); // The authored cue.
		// Now hammer the boss past 50% HP — auto-emit must NOT re-fire because
		// the authored cue already advanced to phase 2 and stamped the key.
		const boss = director.getEnemy('boss-garrison');
		if (!boss) throw new Error('expected boss-garrison alive');
		const halfHp = boss.hp * 0.5;
		while ((director.getEnemy('boss-garrison')?.hp ?? 0) > halfHp) {
			director.hitEnemy('boss-garrison', 'head');
		}
		expect(cueFires.filter((f) => f.verb === 'boss-phase').length).toBe(initial);
	});
});

describe('EncounterDirector — justice-glint window', () => {
	function justiceSetup() {
		// Spawn one middle-manager on a justice-glint program at pos-1.
		const cues: Cue[] = [
			{
				id: 'p1-spawn-justice',
				trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
				action: {
					verb: 'enemy-spawn',
					railId: 'r1',
					archetype: 'middle-manager',
					fireProgram: 'justice-glint',
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
					speed: 4,
					loop: false,
				},
			],
			difficulty: 'normal',
			listener: noopListener,
		});
		// Tick to pos-1 — spawns the justice-glint enemy. Glide takes ~1.25s
		// at speed 4. After 2s of ticks the enemy has been alive for the time
		// remaining after arrival.
		director.tick(2000);
		const enemy = [
			...(director as unknown as { state: { enemies: Map<string, unknown> } }).state.enemies.keys(),
		][0];
		if (!enemy) throw new Error('expected justice-glint enemy spawned');
		return { director, enemyId: enemy };
	}

	it('window is closed before aim-laser starts (elapsedMs < 300)', () => {
		const { director, enemyId } = justiceSetup();
		expect(director.isJusticeWindowOpen(enemyId)).toBe(false);
	});

	it('window is open during aim-laser phase (300 ≤ elapsedMs < 600)', () => {
		const { director, enemyId } = justiceSetup();
		// Tick another 400ms — pushes enemy past the aim-laser event (atMs:300)
		// but short of the fire-hitscan event (atMs:600). Window must be open.
		director.tick(400);
		expect(director.isJusticeWindowOpen(enemyId)).toBe(true);
	});

	it('window closes after fire-hitscan event (elapsedMs ≥ 600)', () => {
		const { director, enemyId } = justiceSetup();
		// Tick well past the fire-hitscan event — window must be closed.
		director.tick(800);
		expect(director.isJusticeWindowOpen(enemyId)).toBe(false);
	});

	it('returns false for non-justice-glint programs', () => {
		// Spawn a regular middle-manager on pistol-pop-aim. isJusticeWindowOpen
		// must always return false regardless of timing.
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
					speed: 4,
					loop: false,
				},
			],
			difficulty: 'normal',
			listener: noopListener,
		});
		director.tick(2000);
		const enemyId = [
			...(director as unknown as { state: { enemies: Map<string, unknown> } }).state.enemies.keys(),
		][0];
		if (!enemyId) throw new Error('expected enemy spawned');
		// Tick through several seconds of the program — window must stay closed.
		for (let i = 0; i < 5; i++) director.tick(500);
		expect(director.isJusticeWindowOpen(enemyId)).toBe(false);
	});

	it('returns false for unknown enemy ids', () => {
		const { director } = justiceSetup();
		expect(director.isJusticeWindowOpen('does-not-exist')).toBe(false);
	});
});
