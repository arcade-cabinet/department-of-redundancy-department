import { describe, expect, it } from 'vitest';
import { BLOCK_IDS } from '../blocks/BlockRegistry';
import { CHUNK_SIZE, CHUNK_VOLUME, ChunkData } from './ChunkData';

describe('ChunkData', () => {
	it('CHUNK_SIZE = 16, CHUNK_VOLUME = 4096', () => {
		expect(CHUNK_SIZE).toBe(16);
		expect(CHUNK_VOLUME).toBe(16 * 16 * 16);
	});

	it('initializes filled with air (id=0)', () => {
		const c = new ChunkData();
		expect(c.get(0, 0, 0)).toBe(BLOCK_IDS.air);
		expect(c.get(15, 15, 15)).toBe(BLOCK_IDS.air);
		expect(c.dirty).toBe(false);
	});

	it('round-trips block ids via set/get', () => {
		const c = new ChunkData();
		c.set(3, 5, 7, BLOCK_IDS['cubicle-wall']);
		expect(c.get(3, 5, 7)).toBe(BLOCK_IDS['cubicle-wall']);
	});

	it('marks dirty on first non-noop set, stays dirty after', () => {
		const c = new ChunkData();
		c.set(0, 0, 0, BLOCK_IDS['carpet-floor']);
		expect(c.dirty).toBe(true);
		c.set(1, 1, 1, BLOCK_IDS['carpet-floor']);
		expect(c.dirty).toBe(true);
	});

	it('does NOT mark dirty when set replays the same id', () => {
		const c = new ChunkData();
		c.set(2, 2, 2, BLOCK_IDS.air); // same as init value
		expect(c.dirty).toBe(false);
	});

	it('clearDirty() resets the flag', () => {
		const c = new ChunkData();
		c.set(0, 0, 0, BLOCK_IDS.drywall);
		c.clearDirty();
		expect(c.dirty).toBe(false);
	});

	it('throws on out-of-bounds get/set', () => {
		const c = new ChunkData();
		expect(() => c.get(-1, 0, 0)).toThrow();
		expect(() => c.get(16, 0, 0)).toThrow();
		expect(() => c.set(0, 0, 99, 1)).toThrow();
	});

	it('fromBuffer adopts an existing Uint16Array without copy', () => {
		const buf = new Uint16Array(CHUNK_VOLUME);
		buf[0] = BLOCK_IDS['cubicle-wall'];
		const c = ChunkData.fromBuffer(buf);
		expect(c.get(0, 0, 0)).toBe(BLOCK_IDS['cubicle-wall']);
		// Mutation through the chunk reflects in the original buffer (zero-copy contract).
		c.set(1, 0, 0, BLOCK_IDS.drywall);
		expect(buf[1]).toBe(BLOCK_IDS.drywall);
	});

	it('fromBuffer rejects wrong-size buffers', () => {
		expect(() => ChunkData.fromBuffer(new Uint16Array(100))).toThrow(/size/i);
	});

	it('fromBuffer rejects subarray/view buffers (isolation contract)', () => {
		const big = new Uint16Array(CHUNK_VOLUME * 2);
		const view = big.subarray(0, CHUNK_VOLUME);
		expect(() => ChunkData.fromBuffer(view)).toThrow(/isolated|subarray|view/i);
	});

	it('toBuffer returns the underlying typed array (for persistence)', () => {
		const c = new ChunkData();
		c.set(0, 0, 0, BLOCK_IDS.drywall);
		const buf = c.toBuffer();
		expect(buf.length).toBe(CHUNK_VOLUME);
		expect(buf[0]).toBe(BLOCK_IDS.drywall);
	});
});
