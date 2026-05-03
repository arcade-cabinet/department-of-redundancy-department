import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, test } from 'vitest';
import {
	advanceSpawnRail,
	createSpawnRailState,
	type SpawnRailGraph,
	spawnRailPosition,
} from './SpawnRail';

function makeGraph(
	path: Vector3[],
	{ speed = 1, loop = false }: { speed?: number; loop?: boolean } = {},
): SpawnRailGraph {
	return { id: 'test-rail', path, speed, loop };
}

describe('createSpawnRailState', () => {
	test('throws on empty path', () => {
		expect(() => createSpawnRailState(makeGraph([]))).toThrow(/empty path/);
	});

	test('single-waypoint rail starts atEnd', () => {
		const state = createSpawnRailState(makeGraph([new Vector3(1, 2, 3)]));
		expect(state.atEnd).toBe(true);
	});

	test('multi-waypoint rail starts at waypoint 0, segmentT 0, not atEnd', () => {
		const state = createSpawnRailState(makeGraph([new Vector3(0, 0, 0), new Vector3(10, 0, 0)]));
		expect(state.waypointIndex).toBe(0);
		expect(state.segmentT).toBe(0);
		expect(state.atEnd).toBe(false);
	});
});

describe('spawnRailPosition', () => {
	test('returns the only waypoint when atEnd', () => {
		const target = new Vector3(5, 6, 7);
		const state = createSpawnRailState(makeGraph([target]));
		const pos = spawnRailPosition(state);
		expect(pos.x).toBe(5);
		expect(pos.y).toBe(6);
		expect(pos.z).toBe(7);
	});

	test('lerps between waypoints based on segmentT', () => {
		const state = createSpawnRailState(makeGraph([new Vector3(0, 0, 0), new Vector3(10, 0, 0)]));
		const advanced = { ...state, segmentT: 0.5 };
		const pos = spawnRailPosition(advanced);
		expect(pos.x).toBeCloseTo(5, 6);
	});
});

describe('advanceSpawnRail', () => {
	test('atEnd state is unchanged by further advance calls', () => {
		const state = createSpawnRailState(makeGraph([new Vector3(0, 0, 0)]));
		const advanced = advanceSpawnRail(state, 1000);
		expect(advanced).toBe(state);
	});

	test('zero or negative dt is a no-op', () => {
		const state = createSpawnRailState(makeGraph([new Vector3(0, 0, 0), new Vector3(10, 0, 0)]));
		expect(advanceSpawnRail(state, 0)).toBe(state);
		expect(advanceSpawnRail(state, -100)).toBe(state);
	});

	test('partial advance progresses segmentT toward 1', () => {
		// 10m segment at 5 m/s = 2000ms total. Advance 1000ms → segmentT 0.5.
		const state = createSpawnRailState(
			makeGraph([new Vector3(0, 0, 0), new Vector3(10, 0, 0)], { speed: 5 }),
		);
		const advanced = advanceSpawnRail(state, 1000);
		expect(advanced.waypointIndex).toBe(0);
		expect(advanced.segmentT).toBeCloseTo(0.5, 6);
		expect(advanced.atEnd).toBe(false);
	});

	test('overflow advances to next waypoint and continues', () => {
		// Two segments: 0→10 then 10→20, speed 5 m/s. Each 2s.
		// Advance 3000ms (half of segment 2 used after consuming all of segment 1).
		const state = createSpawnRailState(
			makeGraph([new Vector3(0, 0, 0), new Vector3(10, 0, 0), new Vector3(20, 0, 0)], {
				speed: 5,
			}),
		);
		const advanced = advanceSpawnRail(state, 3000);
		expect(advanced.waypointIndex).toBe(1);
		expect(advanced.segmentT).toBeCloseTo(0.5, 6);
		expect(advanced.atEnd).toBe(false);
	});

	test('non-looping rail past last waypoint flips atEnd', () => {
		const state = createSpawnRailState(
			makeGraph([new Vector3(0, 0, 0), new Vector3(1, 0, 0)], { speed: 1 }),
		);
		// 1m at 1 m/s = 1000ms. Advance 5s — overshoots into atEnd.
		const advanced = advanceSpawnRail(state, 5000);
		expect(advanced.atEnd).toBe(true);
	});

	test('looping rail wraps to waypoint 0 with overflow consumed', () => {
		const state = createSpawnRailState(
			makeGraph([new Vector3(0, 0, 0), new Vector3(2, 0, 0)], { speed: 1, loop: true }),
		);
		// 2m at 1 m/s = 2000ms per leg. Advance 3000ms → wrap, then 1000ms in.
		const advanced = advanceSpawnRail(state, 3000);
		expect(advanced.atEnd).toBe(false);
		expect(advanced.waypointIndex).toBe(0);
		expect(advanced.segmentT).toBeCloseTo(0.5, 6);
	});

	test('zero-length segment jumps to next waypoint without consuming dt', () => {
		// Segment 0→0 is degenerate; advance should fast-forward through it.
		const state = createSpawnRailState(
			makeGraph([new Vector3(0, 0, 0), new Vector3(0, 0, 0), new Vector3(10, 0, 0)], {
				speed: 5,
			}),
		);
		const advanced = advanceSpawnRail(state, 1000);
		// Skipped seg 0; on seg 1 (0→10@5m/s), 1000ms = halfway.
		expect(advanced.waypointIndex).toBe(1);
		expect(advanced.segmentT).toBeCloseTo(0.5, 6);
	});
});
