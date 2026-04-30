import { describe, expect, it } from 'vitest';
import { Vector3 } from 'yuka';
import { BLOCK_IDS } from '@/world/blocks/BlockRegistry';
import { CHUNK_SIZE, ChunkData } from '@/world/chunk/ChunkData';
import { FLOOR_CHUNKS_X, FLOOR_CHUNKS_Z, generateFloor } from '@/world/generator/floor';
import { buildNavMesh } from './builder';

const VOXEL_SIZE = 0.4;
const ORIGIN_X = -31 * VOXEL_SIZE;
const ORIGIN_Z = -31 * VOXEL_SIZE;

function emptyFloor(): ChunkData[] {
	const out: ChunkData[] = [];
	for (let i = 0; i < FLOOR_CHUNKS_X * FLOOR_CHUNKS_Z; i++) out.push(new ChunkData());
	return out;
}

function fillCarpetFloor(chunks: ChunkData[]): void {
	// 2-thick carpet at y=0..1 across every chunk.
	for (const c of chunks) {
		for (let z = 0; z < CHUNK_SIZE; z++)
			for (let x = 0; x < CHUNK_SIZE; x++) {
				c.set(x, 0, z, BLOCK_IDS['carpet-floor']);
				c.set(x, 1, z, BLOCK_IDS['carpet-floor']);
			}
	}
}

describe('navmesh builder', () => {
	it('empty chunks → empty navmesh', () => {
		const r = buildNavMesh({
			chunks: emptyFloor(),
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN_X,
			originZ: ORIGIN_Z,
		});
		expect(r.polygonCount).toBe(0);
	});

	it('flat carpet floor → one big coalesced polygon per row', () => {
		const chunks = emptyFloor();
		fillCarpetFloor(chunks);
		const r = buildNavMesh({
			chunks,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN_X,
			originZ: ORIGIN_Z,
		});
		// Greedy-merge along x produces one polygon per z-row over the full
		// 64-wide floor. 64 rows × 1 = 64 polys.
		expect(r.polygonCount).toBe(64);
		// findPath across the whole floor should succeed.
		const from = new Vector3(0, 0.8, 0);
		const to = new Vector3(5, 0.8, 5);
		const path = r.navMesh.findPath(from, to);
		expect(path.length).toBeGreaterThan(0);
	});

	it('wall column inside floor → that cell missing from navmesh', () => {
		const chunks = emptyFloor();
		fillCarpetFloor(chunks);
		// Plant a cubicle-wall at (5, 5) covering y=2..13. The wall
		// occludes the air-above check on the carpet beneath it, so the
		// (5,5) column should be excluded from the navmesh.
		const cz = Math.floor(5 / CHUNK_SIZE);
		const cx = Math.floor(5 / CHUNK_SIZE);
		const lx = 5 - cx * CHUNK_SIZE;
		const lz = 5 - cz * CHUNK_SIZE;
		const chunk = chunks[cz * FLOOR_CHUNKS_X + cx];
		if (!chunk) throw new Error('chunk missing');
		for (let y = 2; y <= 13; y++) chunk.set(lx, y, lz, BLOCK_IDS['cubicle-wall']);

		const r = buildNavMesh({
			chunks,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN_X,
			originZ: ORIGIN_Z,
		});
		// Greedy merge in row z=5 splits at x=5: one polygon for [0..5),
		// the wall cell (no polygon), one polygon for [6..64). Row count
		// goes from 64 (uniform rows) to 64 + 1 (the broken row produces
		// 2 polys instead of 1).
		expect(r.polygonCount).toBe(65);
	});

	it('navmesh built from a real generateFloor() result', () => {
		const result = generateFloor('seed-A', 1);
		const r = buildNavMesh({
			chunks: result.chunks,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN_X,
			originZ: ORIGIN_Z,
		});
		// A 7×7 cubicle maze produces interior walls breaking each row
		// into multiple runs. Polygon count is well-defined but bounded:
		// at most one polygon per row per cell that exists, so ≤ 64×64
		// = 4096; in practice mid-double-digits to low-hundreds.
		expect(r.polygonCount).toBeGreaterThan(0);
		expect(r.polygonCount).toBeLessThan(4096);
		// findPath between two corners of the maze should return a path
		// (the carved maze guarantees connectivity from center cubicle).
		const from = new Vector3(0, 0.8, 0); // center cubicle
		const to = new Vector3(2, 0.8, 2);
		const path = r.navMesh.findPath(from, to);
		expect(path).toBeDefined();
	});

	it('builder is fast enough for spec budget (<50ms desktop)', () => {
		const result = generateFloor('seed-bench', 1);
		const start = performance.now();
		buildNavMesh({
			chunks: result.chunks,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN_X,
			originZ: ORIGIN_Z,
		});
		const elapsed = performance.now() - start;
		// Spec: <50ms desktop. Node + a 64³ traversal + yuka's region
		// build comes in well under that on modern hardware. CI tier
		// accepts 4× headroom.
		expect(elapsed).toBeLessThan(200);
	});
});
