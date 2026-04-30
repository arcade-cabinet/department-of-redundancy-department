import { describe, expect, it } from 'vitest';
import { generateFloor } from '@/world/generator/floor';
import { planSpawns } from './spawner';

const VOXEL_SIZE = 0.4;
const ORIGIN = -31 * VOXEL_SIZE;

describe('enemy spawner', () => {
	it('returns 3 spawns from a generated floor', () => {
		const floor = generateFloor('seed-A', 1);
		const spawns = planSpawns({
			chunks: floor.chunks,
			seed: 'seed-A',
			floor: 1,
			count: 3,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN,
			originZ: ORIGIN,
		});
		expect(spawns.length).toBe(3);
		// Each spawn has world + voxel coordinates.
		for (const s of spawns) {
			expect(s.world).toBeDefined();
			expect(s.voxel.x).toBeGreaterThanOrEqual(0);
			expect(s.voxel.z).toBeGreaterThanOrEqual(0);
		}
	});

	it('is deterministic for the same (seed, floor)', () => {
		const floor = generateFloor('seed-A', 1);
		const a = planSpawns({
			chunks: floor.chunks,
			seed: 'seed-A',
			floor: 1,
			count: 3,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN,
			originZ: ORIGIN,
		});
		const b = planSpawns({
			chunks: floor.chunks,
			seed: 'seed-A',
			floor: 1,
			count: 3,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN,
			originZ: ORIGIN,
		});
		expect(a.length).toBe(b.length);
		for (let i = 0; i < a.length; i++) {
			const aSpawn = a[i];
			const bSpawn = b[i];
			expect(aSpawn?.voxel).toEqual(bSpawn?.voxel);
		}
	});

	it('different floors → different spawn sets', () => {
		const floor1 = generateFloor('seed-A', 1);
		const floor2 = generateFloor('seed-A', 2);
		const a = planSpawns({
			chunks: floor1.chunks,
			seed: 'seed-A',
			floor: 1,
			count: 3,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN,
			originZ: ORIGIN,
		});
		const b = planSpawns({
			chunks: floor2.chunks,
			seed: 'seed-A',
			floor: 2,
			count: 3,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN,
			originZ: ORIGIN,
		});
		// At least one spawn should differ (different RNG track).
		const aFirst = a[0];
		const bFirst = b[0];
		expect(aFirst?.voxel).not.toEqual(bFirst?.voxel);
	});

	it('respects min separation constraint when satisfiable', () => {
		const floor = generateFloor('seed-A', 1);
		const spawns = planSpawns({
			chunks: floor.chunks,
			seed: 'seed-A',
			floor: 1,
			count: 3,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN,
			originZ: ORIGIN,
			minVoxelSeparation: 6,
		});
		for (let i = 0; i < spawns.length; i++) {
			for (let j = i + 1; j < spawns.length; j++) {
				const a = spawns[i];
				const b = spawns[j];
				if (!a || !b) continue;
				const dx = a.voxel.x - b.voxel.x;
				const dz = a.voxel.z - b.voxel.z;
				expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(6);
			}
		}
	});

	it('count=0 returns empty array', () => {
		const floor = generateFloor('seed-A', 1);
		const spawns = planSpawns({
			chunks: floor.chunks,
			seed: 'seed-A',
			floor: 1,
			count: 0,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN,
			originZ: ORIGIN,
		});
		expect(spawns).toEqual([]);
	});
});
