import { describe, expect, it } from 'vitest';
import { createRng } from '@/world/generator/rng';
import {
	pickTeleportCell,
	REAPER_TELEPORT_MAX_DISTANCE,
	REAPER_TELEPORT_MIN_DISTANCE,
} from './reaperTeleport';

describe('Reaper teleport target picker', () => {
	it('picks a cell within max distance and beyond min distance from player', () => {
		const rng = createRng('seed-A::tp');
		const player = { x: 10, y: 0, z: 10 };
		const walkable = generateWalkableGrid(0, 20, 0, 20);
		for (let i = 0; i < 100; i++) {
			const target = pickTeleportCell(walkable, player, rng);
			expect(target).not.toBeNull();
			if (!target) continue;
			const dist = Math.sqrt((target.x - player.x) ** 2 + (target.z - player.z) ** 2);
			expect(dist).toBeGreaterThanOrEqual(REAPER_TELEPORT_MIN_DISTANCE);
			expect(dist).toBeLessThanOrEqual(REAPER_TELEPORT_MAX_DISTANCE);
		}
	});

	it('returns null if no walkable cell falls in the band', () => {
		const rng = createRng('seed-A::tp');
		const player = { x: 50, y: 0, z: 50 };
		const walkable = generateWalkableGrid(0, 20, 0, 20); // all far from player
		const target = pickTeleportCell(walkable, player, rng);
		expect(target).toBeNull();
	});

	it('determinism: same rng + same input = same target', () => {
		const player = { x: 10, y: 0, z: 10 };
		const walkable = generateWalkableGrid(0, 20, 0, 20);
		const a = pickTeleportCell(walkable, player, createRng('S'));
		const b = pickTeleportCell(walkable, player, createRng('S'));
		expect(a).toEqual(b);
	});

	it('constants match spec (min 2u, max 8u)', () => {
		expect(REAPER_TELEPORT_MIN_DISTANCE).toBe(2);
		expect(REAPER_TELEPORT_MAX_DISTANCE).toBe(8);
	});
});

function generateWalkableGrid(
	x0: number,
	x1: number,
	z0: number,
	z1: number,
): { x: number; y: number; z: number }[] {
	const out: { x: number; y: number; z: number }[] = [];
	for (let x = x0; x <= x1; x++) {
		for (let z = z0; z <= z1; z++) {
			out.push({ x, y: 0, z });
		}
	}
	return out;
}
