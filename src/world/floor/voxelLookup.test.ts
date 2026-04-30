import { describe, expect, it } from 'vitest';
import { BLOCK_IDS } from '@/world/blocks/BlockRegistry';
import { generateFloor } from '@/world/generator/floor';
import { blockIdAt, setBlockAt, voxelToWorld, worldToVoxel } from './voxelLookup';

describe('voxel lookup', () => {
	it('worldToVoxel + voxelToWorld round-trip the maze center', () => {
		const v = worldToVoxel({ x: 0, y: 0, z: 0 }, 2);
		expect(v.x).toBe(31);
		expect(v.z).toBe(31);
		const w = voxelToWorld(v);
		expect(w.x).toBeCloseTo(0);
		expect(w.z).toBeCloseTo(0);
	});

	it('blockIdAt returns the carpet at floor row + air mid-air', () => {
		const r = generateFloor('seed-A', 1);
		const carpet = blockIdAt(r.chunks, { x: 5, y: 0, z: 5 });
		expect(carpet).toBe(BLOCK_IDS['carpet-floor']);
		const air = blockIdAt(r.chunks, { x: 5, y: 8, z: 5 });
		expect(air).toBe(BLOCK_IDS.air);
	});

	it('blockIdAt OOB returns air (no crash)', () => {
		const r = generateFloor('seed-A', 1);
		expect(blockIdAt(r.chunks, { x: -1, y: 0, z: 0 })).toBe(0);
		expect(blockIdAt(r.chunks, { x: 999, y: 0, z: 0 })).toBe(0);
	});

	it('setBlockAt mutates the right chunk', () => {
		const r = generateFloor('seed-A', 1);
		const ok = setBlockAt(r.chunks, { x: 7, y: 5, z: 7 }, BLOCK_IDS['placed-wall-block']);
		expect(ok).toBe(true);
		expect(blockIdAt(r.chunks, { x: 7, y: 5, z: 7 })).toBe(BLOCK_IDS['placed-wall-block']);
	});
});
