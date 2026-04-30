import { describe, expect, it } from 'vitest';
import { type DoorRouterCtx, routeTap } from './floorRouter';

const baseCtx = (over: Partial<DoorRouterCtx> = {}): DoorRouterCtx => ({
	upDoor: { x: 5, y: 2, z: 5 },
	downDoor: { x: 10, y: 2, z: 10 },
	currentFloor: 1,
	playerPos: { x: 5, y: 0.8, z: 5 },
	tapWorld: { x: 5, y: 2, z: 5 },
	tapMaxDistance: 1.5,
	playerMaxDistance: 2.0,
	...over,
});

describe('floor router — door tap classification', () => {
	it('tap on the up-door voxel within tap radius returns "up"', () => {
		const r = routeTap(baseCtx());
		expect(r).toBe('up');
	});

	it('tap on the down-door voxel returns "down" (when not on floor 1)', () => {
		const r = routeTap(
			baseCtx({
				tapWorld: { x: 10, y: 2, z: 10 },
				playerPos: { x: 10, y: 0.8, z: 10 },
				currentFloor: 2,
			}),
		);
		expect(r).toBe('down');
	});

	it('tap far from any door returns null', () => {
		const r = routeTap(baseCtx({ tapWorld: { x: 50, y: 2, z: 50 } }));
		expect(r).toBeNull();
	});

	it('door tap rejected if player too far from the door', () => {
		const r = routeTap(baseCtx({ playerPos: { x: 30, y: 0.8, z: 30 } }));
		expect(r).toBeNull();
	});

	it('floor 1 down-door is unreachable (no floor 0)', () => {
		// PRQ-12 spec: cannot descend below floor 1. Tap on a down-door
		// when on floor 1 returns null so the runtime never tries to swap.
		const r = routeTap(
			baseCtx({
				tapWorld: { x: 10, y: 2, z: 10 },
				playerPos: { x: 10, y: 0.8, z: 10 },
				currentFloor: 1,
			}),
		);
		expect(r).toBeNull();
	});

	it('floor 2 down-door is reachable', () => {
		const r = routeTap(
			baseCtx({
				tapWorld: { x: 10, y: 2, z: 10 },
				playerPos: { x: 10, y: 0.8, z: 10 },
				currentFloor: 2,
			}),
		);
		expect(r).toBe('down');
	});

	it('tap inside both radii tie-breaks by player→door distance', () => {
		// Both doors close to tap; player is right next to up-door.
		// Player-distance tie-break picks 'up' even though tap is
		// equidistant.
		const r = routeTap(
			baseCtx({
				upDoor: { x: 5, y: 2, z: 5 },
				downDoor: { x: 5.5, y: 2, z: 5.5 },
				playerPos: { x: 5, y: 0.8, z: 5 },
				tapWorld: { x: 5.25, y: 2, z: 5.25 },
				currentFloor: 2,
			}),
		);
		expect(r).toBe('up');
	});

	it('tap inside both radii: when player is closer to down-door, picks down', () => {
		const r = routeTap(
			baseCtx({
				upDoor: { x: 5, y: 2, z: 5 },
				downDoor: { x: 6, y: 2, z: 6 },
				playerPos: { x: 6, y: 0.8, z: 6 },
				tapWorld: { x: 5.5, y: 2, z: 5.5 },
				currentFloor: 2,
			}),
		);
		expect(r).toBe('down');
	});
});
