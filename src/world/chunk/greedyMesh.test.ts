import { describe, expect, it } from 'vitest';
import { BLOCK_IDS } from '../blocks/BlockRegistry';
import { CHUNK_SIZE, ChunkData } from './ChunkData';
import { greedyMesh } from './greedyMesh';

const VERTS_PER_QUAD = 4;
const INDICES_PER_QUAD = 6;
const FLOATS_PER_POS = 3;
const FLOATS_PER_NORMAL = 3;
const FLOATS_PER_UV = 2;

describe('greedyMesh', () => {
	it('empty chunk produces no geometry', () => {
		const c = new ChunkData();
		const mesh = greedyMesh(c);
		expect(mesh.positions.length).toBe(0);
		expect(mesh.indices.length).toBe(0);
		expect(mesh.normals.length).toBe(0);
		expect(mesh.uvs.length).toBe(0);
	});

	it('single solid block produces 6 quads (one per face)', () => {
		const c = new ChunkData();
		c.set(8, 8, 8, BLOCK_IDS['cubicle-wall']);
		const mesh = greedyMesh(c);
		expect(mesh.indices.length).toBe(6 * INDICES_PER_QUAD);
		expect(mesh.positions.length).toBe(6 * VERTS_PER_QUAD * FLOATS_PER_POS);
		expect(mesh.normals.length).toBe(6 * VERTS_PER_QUAD * FLOATS_PER_NORMAL);
		expect(mesh.uvs.length).toBe(6 * VERTS_PER_QUAD * FLOATS_PER_UV);
	});

	it('chunk fully filled with one block produces 6 quads (greedy AABB)', () => {
		const c = new ChunkData();
		for (let y = 0; y < CHUNK_SIZE; y++)
			for (let z = 0; z < CHUNK_SIZE; z++)
				for (let x = 0; x < CHUNK_SIZE; x++) c.set(x, y, z, BLOCK_IDS['cubicle-wall']);
		const mesh = greedyMesh(c);
		// 6 outer faces of the 16×16 cube; greedy mesher should coalesce
		// each face's 256 cells into one 16×16 quad.
		expect(mesh.indices.length).toBe(6 * INDICES_PER_QUAD);
	});

	it('two adjacent solid blocks share a face (the touching face is hidden)', () => {
		const c = new ChunkData();
		c.set(5, 5, 5, BLOCK_IDS['cubicle-wall']);
		c.set(6, 5, 5, BLOCK_IDS['cubicle-wall']);
		const mesh = greedyMesh(c);
		// Two cubes glued on +x/-x → 12 - 2 = 10 quad-equivalents,
		// but the greedy mesher merges adjacent same-block faces, so
		// what was 2 separate 1×1 faces on top/bottom becomes 1 quad each.
		// Total faces: top, bottom, north, south = 4 quads (2 cells each, merged),
		// + 2 end-caps = 6 quads.
		expect(mesh.indices.length).toBe(6 * INDICES_PER_QUAD);
	});

	it('two different block types do NOT merge across boundary', () => {
		const c = new ChunkData();
		c.set(5, 5, 5, BLOCK_IDS['cubicle-wall']);
		c.set(6, 5, 5, BLOCK_IDS.drywall);
		const mesh = greedyMesh(c);
		// 5 outward faces from cubicle-wall + 5 outward faces from drywall +
		// the inner shared face is exposed BOTH ways (each block sees the
		// other as not-self-not-air, so each emits its own face).
		// Count: each cube has 6 faces, but the shared boundary in this
		// model: a non-air neighbor of *different type* still hides the
		// face if both are solid (we hide only solid↔solid same-or-different
		// since you can't see them). Actually no — visually you'd want to
		// SEE the boundary between drywall and cubicle-wall. Spec calls
		// for showing both sides. So expect 12 quads (6 per cube, no merge).
		expect(mesh.indices.length).toBe(12 * INDICES_PER_QUAD);
	});

	it('non-solid blocks do not emit faces', () => {
		const c = new ChunkData();
		c.set(5, 5, 5, BLOCK_IDS['up-door-frame']); // solid: false
		const mesh = greedyMesh(c);
		expect(mesh.indices.length).toBe(0);
	});

	it('positions are within [0, CHUNK_SIZE]', () => {
		const c = new ChunkData();
		for (let y = 0; y < 4; y++)
			for (let z = 0; z < 4; z++)
				for (let x = 0; x < 4; x++) c.set(x, y, z, BLOCK_IDS['carpet-floor']);
		const mesh = greedyMesh(c);
		for (let i = 0; i < mesh.positions.length; i++) {
			const p = mesh.positions[i] as number;
			expect(p).toBeGreaterThanOrEqual(0);
			expect(p).toBeLessThanOrEqual(CHUNK_SIZE);
		}
	});

	it('indices reference valid vertices', () => {
		const c = new ChunkData();
		c.set(0, 0, 0, BLOCK_IDS['cubicle-wall']);
		const mesh = greedyMesh(c);
		const vertCount = mesh.positions.length / FLOATS_PER_POS;
		for (let i = 0; i < mesh.indices.length; i++) {
			const idx = mesh.indices[i] as number;
			expect(idx).toBeGreaterThanOrEqual(0);
			expect(idx).toBeLessThan(vertCount);
		}
	});
});
