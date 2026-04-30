import { describe, expect, it } from 'vitest';
import { BLOCK_IDS } from '../blocks/BlockRegistry';
import { CHUNK_SIZE, type ChunkData } from '../chunk/ChunkData';
import {
	FLOOR_CHUNKS_X,
	FLOOR_FLOOR_Y_TOP,
	FLOOR_VOXELS_X,
	FLOOR_VOXELS_Z,
	generateFloor,
} from './floor';

function readVoxel(chunks: ChunkData[], wx: number, wy: number, wz: number): number {
	const cx = Math.floor(wx / CHUNK_SIZE);
	const cz = Math.floor(wz / CHUNK_SIZE);
	const lx = wx - cx * CHUNK_SIZE;
	const lz = wz - cz * CHUNK_SIZE;
	const idx = cz * FLOOR_CHUNKS_X + cx;
	const c = chunks[idx];
	if (!c) throw new Error('chunk OOB');
	return c.get(lx, wy, lz);
}

describe('door placement', () => {
	it('every floor has exactly one up-door and one down-door', () => {
		const r = generateFloor('seed-X', 1);
		expect(r.upDoor).toBeDefined();
		expect(r.downDoor).toBeDefined();
		const id = readVoxel(r.chunks, r.upDoor.x, r.upDoor.y, r.upDoor.z);
		expect(id).toBe(BLOCK_IDS['up-door-frame']);
		const id2 = readVoxel(r.chunks, r.downDoor.x, r.downDoor.y, r.downDoor.z);
		expect(id2).toBe(BLOCK_IDS['down-door-frame']);
	});

	it('door positions are deterministic across runs', () => {
		const a = generateFloor('seed-X', 3);
		const b = generateFloor('seed-X', 3);
		expect(a.upDoor).toEqual(b.upDoor);
		expect(a.downDoor).toEqual(b.downDoor);
	});

	it('different floors get different door layouts', () => {
		const a = generateFloor('seed-X', 1);
		const b = generateFloor('seed-X', 2);
		const same =
			a.upDoor.x === b.upDoor.x &&
			a.upDoor.z === b.upDoor.z &&
			a.downDoor.x === b.downDoor.x &&
			a.downDoor.z === b.downDoor.z;
		expect(same).toBe(false);
	});

	it('up-door and down-door never coincide', () => {
		for (let f = 1; f <= 10; f++) {
			const r = generateFloor('seed-X', f);
			expect(r.upDoor.x === r.downDoor.x && r.upDoor.z === r.downDoor.z).toBe(false);
		}
	});

	it('doors sit on the floor row (y = FLOOR_FLOOR_Y_TOP + 1)', () => {
		const r = generateFloor('seed-X', 1);
		expect(r.upDoor.y).toBe(FLOOR_FLOOR_Y_TOP + 1);
		expect(r.downDoor.y).toBe(FLOOR_FLOOR_Y_TOP + 1);
	});

	it('doors lie inside the playable bounds', () => {
		const r = generateFloor('seed-X', 1);
		expect(r.upDoor.x).toBeGreaterThanOrEqual(0);
		expect(r.upDoor.x).toBeLessThan(FLOOR_VOXELS_X);
		expect(r.upDoor.z).toBeGreaterThanOrEqual(0);
		expect(r.upDoor.z).toBeLessThan(FLOOR_VOXELS_Z);
		expect(r.downDoor.x).toBeGreaterThanOrEqual(0);
		expect(r.downDoor.x).toBeLessThan(FLOOR_VOXELS_X);
		expect(r.downDoor.z).toBeGreaterThanOrEqual(0);
		expect(r.downDoor.z).toBeLessThan(FLOOR_VOXELS_Z);
	});
});
