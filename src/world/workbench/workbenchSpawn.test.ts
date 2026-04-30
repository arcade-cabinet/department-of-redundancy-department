import { describe, expect, it } from 'vitest';
import { isWorkbenchFloor, workbenchPositionFor } from './workbenchSpawn';

describe('workbenchSpawn', () => {
	it.each([5, 10, 15, 20])('floor %i is a workbench floor', (n) => {
		expect(isWorkbenchFloor(n)).toBe(true);
	});

	it.each([1, 2, 3, 4, 6, 7, 8, 9, 11])('floor %i is not a workbench floor', (n) => {
		expect(isWorkbenchFloor(n)).toBe(false);
	});

	it('workbenchPositionFor is deterministic per (seed, floor)', () => {
		const a = workbenchPositionFor('seed-A', 5, { x: 0, y: 0, z: 8 });
		const b = workbenchPositionFor('seed-A', 5, { x: 0, y: 0, z: 8 });
		expect(a).toEqual(b);
	});

	it('workbenchPositionFor stays within 4u of the down door', () => {
		const door = { x: 4, y: 0, z: 8 };
		const p = workbenchPositionFor('seed-X', 10, door);
		expect(Math.hypot(p.x - door.x, p.z - door.z)).toBeLessThanOrEqual(4);
	});
});
