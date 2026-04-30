import { NavMesh, Polygon, Vector3 } from 'yuka';
import { BLOCK_REGISTRY } from '@/world/blocks/BlockRegistry';
import { CHUNK_SIZE, type ChunkData } from '@/world/chunk/ChunkData';
import { FLOOR_CHUNKS_X, FLOOR_VOXELS_X, FLOOR_VOXELS_Z } from '@/world/generator/floor';

/**
 * NavMesh builder. Walks the chunk grid for one floor and emits a
 * yuka.NavMesh whose polygons cover every voxel cell whose top face is
 * walkable AND has air above (so the player can stand on it).
 *
 * "Walkable top" = block.walkableTop === true (carpet-floor,
 * laminate-desk-block, placed-stair-block, placed-desk-block). Walls
 * (cubicle-wall, drywall) and ceilings are skipped.
 *
 * Output is in WORLD-SPACE — the same coordinate system as
 * `<ChunkLayer/>` mounts the chunks (voxel units × voxelSize, centered
 * on the maze center cubicle). yuka.NavMesh.findPath() returns world-
 * space points the player vehicle can FollowPathBehavior straight onto.
 *
 * Coalescing strategy: per-row greedy-merge along x then accept the
 * runs as rectangular polygons. Yuka's NavMesh handles arbitrary convex
 * polygons; rectangles are convex. Coalescing keeps the polygon count
 * low (a 64×64 floor with 80% walkable = ~250 quads naive, ~30 quads
 * coalesced) which keeps `findPath` A* well under the 5ms budget.
 */

export interface NavMeshBuildInput {
	chunks: readonly ChunkData[];
	/** World units per voxel — must match ChunkLayer's voxelSize prop. */
	voxelSize: number;
	/** World-space x of the floor's voxel (0,0,0). Mirrors ChunkLayer's
	 *  centering math (`-VOXEL_CENTER_X * voxelSize`). */
	originX: number;
	originZ: number;
}

export interface NavMeshBuildResult {
	navMesh: NavMesh;
	polygonCount: number;
}

/** Returns the highest walkable y-coord (top voxel y) at column (x, z),
 *  or null if no walkable surface exists in the column. */
function topWalkable(chunks: readonly ChunkData[], x: number, z: number): number | null {
	const cx = Math.floor(x / CHUNK_SIZE);
	const cz = Math.floor(z / CHUNK_SIZE);
	const idx = cz * FLOOR_CHUNKS_X + cx;
	const chunk = chunks[idx];
	if (!chunk) return null;
	const lx = x - cx * CHUNK_SIZE;
	const lz = z - cz * CHUNK_SIZE;
	// Walk top-down so we hit the highest walkable surface first.
	for (let y = CHUNK_SIZE - 1; y >= 0; y--) {
		const id = chunk.get(lx, y, lz);
		const block = BLOCK_REGISTRY[id];
		if (!block?.walkableTop) continue;
		// Air above? Without headroom the player can't stand here.
		if (y + 1 < CHUNK_SIZE) {
			const above = chunk.get(lx, y + 1, lz);
			const aboveBlock = BLOCK_REGISTRY[above];
			if (aboveBlock?.solid) continue;
		}
		return y;
	}
	return null;
}

export function buildNavMesh(input: NavMeshBuildInput): NavMeshBuildResult {
	const { chunks, voxelSize, originX, originZ } = input;

	// Per-cell walkable height (or null). Covers the whole floor in voxel
	// coords so we can do row-wise greedy coalescing below.
	const heights: (number | null)[] = new Array(FLOOR_VOXELS_X * FLOOR_VOXELS_Z);
	for (let z = 0; z < FLOOR_VOXELS_Z; z++) {
		for (let x = 0; x < FLOOR_VOXELS_X; x++) {
			heights[z * FLOOR_VOXELS_X + x] = topWalkable(chunks, x, z);
		}
	}

	// Greedy-merge runs of cells in each z-row that share the same height.
	// Each run becomes one rectangular polygon (cell-aligned, `top + 1`
	// in y so the polygon sits on top of the supporting block).
	const polys: Polygon[] = [];
	for (let z = 0; z < FLOOR_VOXELS_Z; z++) {
		let x = 0;
		while (x < FLOOR_VOXELS_X) {
			const h = heights[z * FLOOR_VOXELS_X + x];
			if (h === null) {
				x++;
				continue;
			}
			let runLen = 1;
			while (x + runLen < FLOOR_VOXELS_X && heights[z * FLOOR_VOXELS_X + x + runLen] === h)
				runLen++;
			// h is non-null here per the guard above; assert to satisfy
			// strict-mode tsc on the rectPolygon call.
			polys.push(rectPolygon(x, x + runLen, z, z + 1, h as number, voxelSize, originX, originZ));
			x += runLen;
		}
	}

	const navMesh = new NavMesh();
	navMesh.fromPolygons(polys);
	return { navMesh, polygonCount: polys.length };
}

/** Build a rectangular `Polygon` in world space. The y-plane sits at
 *  `(top + 1) * voxelSize` so the polygon is on TOP of the supporting
 *  voxel — the player stands on it. Vertices wound CCW from above so
 *  yuka's normal points up (+Y). */
function rectPolygon(
	x0: number,
	x1: number,
	z0: number,
	z1: number,
	top: number,
	voxelSize: number,
	originX: number,
	originZ: number,
): Polygon {
	const y = (top + 1) * voxelSize;
	const wx0 = originX + x0 * voxelSize;
	const wx1 = originX + x1 * voxelSize;
	const wz0 = originZ + z0 * voxelSize;
	const wz1 = originZ + z1 * voxelSize;
	// CCW from above: (x0,z0) → (x1,z0) → (x1,z1) → (x0,z1)
	// In world XYZ with Z+ pointing south, CCW-from-above means
	// (small-x small-z) → (large-x small-z) → (large-x large-z) →
	// (small-x large-z). yuka's Polygon.fromContour wants outline points.
	const verts = [
		new Vector3(wx0, y, wz0),
		new Vector3(wx1, y, wz0),
		new Vector3(wx1, y, wz1),
		new Vector3(wx0, y, wz1),
	];
	return new Polygon().fromContour(verts);
}
