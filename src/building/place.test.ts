import { describe, expect, it } from 'vitest';
import { BLOCK_IDS } from '@/world/blocks/BlockRegistry';
import { ChunkData } from '@/world/chunk/ChunkData';
import { canPlace, place } from './place';

function emptyChunk(): ChunkData {
	const c = new ChunkData();
	// Lay carpet at y=1 across the chunk so non-floor blocks have support.
	for (let x = 0; x < 16; x++)
		for (let z = 0; z < 16; z++) c.set(x, 1, z, BLOCK_IDS['carpet-floor']);
	return c;
}

describe('canPlace', () => {
	it('rejects if target voxel occupied', () => {
		const c = emptyChunk();
		c.set(5, 2, 5, BLOCK_IDS['cubicle-wall']);
		const r = canPlace({
			chunk: c,
			target: { x: 5, y: 2, z: 5 },
			playerVoxel: { x: 0, y: 2, z: 0 },
			slug: 'placed-wall-block',
		});
		expect(r.ok).toBe(false);
		expect((r as { reason: string }).reason).toBe('occupied');
	});

	it('rejects non-floor block without support', () => {
		const c = new ChunkData();
		const r = canPlace({
			chunk: c,
			target: { x: 5, y: 5, z: 5 },
			playerVoxel: { x: 0, y: 2, z: 0 },
			slug: 'placed-wall-block',
		});
		expect(r.ok).toBe(false);
		expect((r as { reason: string }).reason).toBe('no-support');
	});

	it('accepts floor block with no support beneath (re-paving)', () => {
		const c = new ChunkData();
		const r = canPlace({
			chunk: c,
			target: { x: 5, y: 5, z: 5 },
			playerVoxel: { x: 0, y: 2, z: 0 },
			slug: 'carpet-floor',
		});
		expect(r.ok).toBe(true);
	});

	it('rejects placing inside the player (foot or head voxel)', () => {
		const c = emptyChunk();
		// Foot voxel: player standing at (5,2,5) with head at (5,3,5).
		// Placing at the foot voxel is rejected.
		const foot = canPlace({
			chunk: c,
			target: { x: 5, y: 2, z: 5 },
			playerVoxel: { x: 5, y: 2, z: 5 },
			slug: 'placed-wall-block',
		});
		expect(foot.ok).toBe(false);
		expect((foot as { reason: string }).reason).toBe('player-blocking');
		// Head voxel: target at (5,3,5) when player at (5,2,5).
		const head = canPlace({
			chunk: c,
			target: { x: 5, y: 3, z: 5 },
			playerVoxel: { x: 5, y: 2, z: 5 },
			slug: 'placed-wall-block',
		});
		expect(head.ok).toBe(false);
		expect((head as { reason: string }).reason).toBe('player-blocking');
		// Below feet — player standing at (5,2,5), placing at (5,1,5):
		// allowed (it's already carpet — replacing carpet, fails on
		// 'occupied' first; use a fresh chunk for that case).
	});

	it('happy path: places non-floor block with support', () => {
		const c = emptyChunk();
		const ctx = {
			chunk: c,
			target: { x: 5, y: 2, z: 5 },
			playerVoxel: { x: 0, y: 2, z: 0 },
			slug: 'placed-wall-block' as const,
		};
		expect(canPlace(ctx).ok).toBe(true);
		expect(place(ctx)).toBe(true);
		expect(c.get(5, 2, 5)).toBe(BLOCK_IDS['placed-wall-block']);
	});

	it('place() returns false on rejection', () => {
		const c = emptyChunk();
		c.set(5, 2, 5, BLOCK_IDS['cubicle-wall']);
		expect(
			place({
				chunk: c,
				target: { x: 5, y: 2, z: 5 },
				playerVoxel: { x: 0, y: 2, z: 0 },
				slug: 'placed-wall-block',
			}),
		).toBe(false);
	});
});
