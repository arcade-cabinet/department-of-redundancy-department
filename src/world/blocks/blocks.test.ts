import { describe, expect, it } from 'vitest';
import { BLOCK_IDS, BLOCK_REGISTRY, BLOCK_SLUGS, type BlockSlug, getBlock } from './BlockRegistry';
import { TILESET_TILE_COUNT } from './tileset';

const REQUIRED_SLUGS: BlockSlug[] = [
	'air',
	'carpet-floor',
	'ceiling-tile',
	'cubicle-wall',
	'drywall',
	'laminate-desk-block',
	'up-door-frame',
	'down-door-frame',
	'supply-closet-wall',
	'placed-stair-block',
	'placed-wall-block',
	'placed-desk-block',
	'placed-terminal',
];

const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const;
type Face = (typeof FACES)[number];

describe('BlockRegistry', () => {
	it('exposes every alpha block type with full property coverage', () => {
		for (const slug of REQUIRED_SLUGS) {
			const b = getBlock(slug);
			expect(b, `block ${slug} missing`).toBeDefined();
			expect(typeof b.solid, `${slug}.solid`).toBe('boolean');
			expect(typeof b.walkableTop, `${slug}.walkableTop`).toBe('boolean');
			expect(typeof b.mineable, `${slug}.mineable`).toBe('boolean');
			expect(['paper', 'plastic', 'metal', null]).toContain(b.toolAffinity);
			for (const face of FACES) {
				const uv = b.faceUVs[face as Face];
				expect(Array.isArray(uv), `${slug}.faceUVs.${face} array`).toBe(true);
				expect(uv.length, `${slug}.faceUVs.${face} length`).toBe(2);
				const u = uv[0];
				const v = uv[1];
				expect(u >= 0 && u <= 1, `${slug}.${face} u range`).toBe(true);
				expect(v >= 0 && v <= 1, `${slug}.${face} v range`).toBe(true);
			}
		}
	});

	it('air is non-solid, non-mineable, non-walkable', () => {
		const air = getBlock('air');
		expect(air.solid).toBe(false);
		expect(air.mineable).toBe(false);
		expect(air.walkableTop).toBe(false);
	});

	it('cubicle-wall is solid, mineable with paper affinity', () => {
		const w = getBlock('cubicle-wall');
		expect(w.solid).toBe(true);
		expect(w.mineable).toBe(true);
		expect(w.toolAffinity).toBe('paper');
	});

	it('every faceUV references a tile inside the atlas grid', () => {
		const tileSize = 1 / Math.sqrt(TILESET_TILE_COUNT);
		for (const slug of REQUIRED_SLUGS) {
			const b = getBlock(slug);
			for (const face of FACES) {
				const [u, v] = b.faceUVs[face as Face];
				expect(u % tileSize === 0 || Math.abs((u / tileSize) % 1) < 1e-9).toBe(true);
				expect(v % tileSize === 0 || Math.abs((v / tileSize) % 1) < 1e-9).toBe(true);
			}
		}
	});

	it('BLOCK_IDS are stable, contiguous, air=0', () => {
		expect(BLOCK_IDS.air).toBe(0);
		const ids = REQUIRED_SLUGS.map((s) => BLOCK_IDS[s]);
		expect(new Set(ids).size).toBe(REQUIRED_SLUGS.length);
		expect(Math.max(...ids)).toBeLessThan(REQUIRED_SLUGS.length);
	});

	it('BLOCK_SLUGS round-trips ids back to slugs', () => {
		for (const slug of REQUIRED_SLUGS) {
			const id = BLOCK_IDS[slug];
			expect(BLOCK_SLUGS[id]).toBe(slug);
		}
	});

	it('BLOCK_REGISTRY indexed by id matches slug entry', () => {
		for (const slug of REQUIRED_SLUGS) {
			const id = BLOCK_IDS[slug];
			expect(BLOCK_REGISTRY[id]?.slug).toBe(slug);
		}
	});

	it('getBlock(unknown) throws for safety (no silent air fallback)', () => {
		// biome-ignore lint/suspicious/noExplicitAny: testing error path with bad input
		expect(() => getBlock('not-a-block' as any)).toThrow(/unknown block/i);
	});
});
