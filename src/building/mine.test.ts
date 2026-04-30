import { describe, expect, it } from 'vitest';
import { BLOCK_IDS } from '@/world/blocks/BlockRegistry';
import { ChunkData } from '@/world/chunk/ChunkData';
import { checkMine, completeMine } from './mine';

describe('mine', () => {
	it('rejects air target', () => {
		const c = new ChunkData();
		const r = checkMine(c, { x: 0, y: 0, z: 0 }, { affinity: 'paper' });
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('air');
	});

	it('rejects non-mineable block (door-frame is gameplay barrier)', () => {
		const c = new ChunkData();
		c.set(0, 0, 0, BLOCK_IDS['up-door-frame']);
		const r = checkMine(c, { x: 0, y: 0, z: 0 }, { affinity: 'any' });
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('not-mineable');
	});

	it('matching tool = full speed; non-matching = 4× slower', () => {
		const c = new ChunkData();
		c.set(5, 5, 5, BLOCK_IDS['cubicle-wall']); // paper affinity
		const fast = checkMine(c, { x: 5, y: 5, z: 5 }, { affinity: 'paper' });
		const slow = checkMine(c, { x: 5, y: 5, z: 5 }, { affinity: 'metal' });
		expect(fast.ok).toBe(true);
		expect(slow.ok).toBe(true);
		expect(slow.timeMs).toBeCloseTo((fast.timeMs ?? 0) * 4, 5);
	});

	it("'any' tool always full speed", () => {
		const c = new ChunkData();
		c.set(5, 5, 5, BLOCK_IDS['cubicle-wall']);
		const r = checkMine(c, { x: 5, y: 5, z: 5 }, { affinity: 'any' });
		expect(r.ok).toBe(true);
		expect(r.timeMs).toBe(800);
	});

	it('completeMine sets target to air and returns slug', () => {
		const c = new ChunkData();
		c.set(2, 2, 2, BLOCK_IDS['laminate-desk-block']);
		const slug = completeMine(c, { x: 2, y: 2, z: 2 });
		expect(slug).toBe('laminate-desk-block');
		expect(c.get(2, 2, 2)).toBe(BLOCK_IDS.air);
	});

	it('completeMine on already-air returns null', () => {
		const c = new ChunkData();
		expect(completeMine(c, { x: 0, y: 0, z: 0 })).toBeNull();
	});
});
