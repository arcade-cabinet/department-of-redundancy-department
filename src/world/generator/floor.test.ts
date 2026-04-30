import { describe, expect, it } from 'vitest';
import { BLOCK_IDS } from '../blocks/BlockRegistry';
import { CHUNK_SIZE, type ChunkData } from '../chunk/ChunkData';
import {
	FLOOR_CEILING_Y,
	FLOOR_CHUNKS_X,
	FLOOR_CHUNKS_Z,
	FLOOR_FLOOR_Y,
	generateFloor,
} from './floor';

describe('generateFloor', () => {
	it('returns FLOOR_CHUNKS_X * FLOOR_CHUNKS_Z chunks', () => {
		const result = generateFloor('seed-A', 1);
		expect(result.chunks.length).toBe(FLOOR_CHUNKS_X * FLOOR_CHUNKS_Z);
	});

	it('is deterministic for the same (seed, floor)', () => {
		const a = generateFloor('seed-A', 1);
		const b = generateFloor('seed-A', 1);
		for (let c = 0; c < a.chunks.length; c++) {
			const ba = (a.chunks[c] as ChunkData).toBuffer();
			const bb = (b.chunks[c] as ChunkData).toBuffer();
			expect(ba.length).toBe(bb.length);
			for (let i = 0; i < ba.length; i++) expect(ba[i]).toBe(bb[i]);
		}
	});

	it('different floors produce different layouts', () => {
		const a = generateFloor('seed-A', 1);
		const b = generateFloor('seed-A', 2);
		const aBuf = (a.chunks[0] as ChunkData).toBuffer();
		const bBuf = (b.chunks[0] as ChunkData).toBuffer();
		// At least one cell differs between floors.
		let differs = false;
		for (let i = 0; i < aBuf.length; i++) {
			if (aBuf[i] !== bBuf[i]) {
				differs = true;
				break;
			}
		}
		expect(differs).toBe(true);
	});

	it('floor row is carpet at FLOOR_FLOOR_Y', () => {
		const result = generateFloor('seed-A', 1);
		const c0 = result.chunks[0] as ChunkData;
		expect(c0.get(0, FLOOR_FLOOR_Y, 0)).toBe(BLOCK_IDS['carpet-floor']);
		expect(c0.get(15, FLOOR_FLOOR_Y, 15)).toBe(BLOCK_IDS['carpet-floor']);
	});

	it('ceiling row is ceiling-tile at FLOOR_CEILING_Y', () => {
		const result = generateFloor('seed-A', 1);
		const c0 = result.chunks[0] as ChunkData;
		expect(c0.get(0, FLOOR_CEILING_Y, 0)).toBe(BLOCK_IDS['ceiling-tile']);
	});

	it('air fills space between floor and ceiling where no walls', () => {
		const result = generateFloor('seed-A', 1);
		// Sample a few chunks; mid-height interior cells should sometimes be air.
		const c0 = result.chunks[0] as ChunkData;
		let airCount = 0;
		const midY = Math.floor((FLOOR_FLOOR_Y + FLOOR_CEILING_Y) / 2);
		for (let z = 0; z < CHUNK_SIZE; z++) {
			for (let x = 0; x < CHUNK_SIZE; x++) {
				if (c0.get(x, midY, z) === BLOCK_IDS.air) airCount++;
			}
		}
		expect(airCount).toBeGreaterThan(0);
	});

	it('wallCount is non-zero (maze produced cubicle walls)', () => {
		const result = generateFloor('seed-A', 1);
		expect(result.wallCount).toBeGreaterThan(0);
	});

	it('exposes floor index + seed in the result', () => {
		const result = generateFloor('seed-A', 3);
		expect(result.floor).toBe(3);
		expect(result.seed).toBe('seed-A');
	});
});
