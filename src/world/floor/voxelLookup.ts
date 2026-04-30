import { CHUNK_SIZE, type ChunkData } from '@/world/chunk/ChunkData';
import { FLOOR_CHUNKS_X, FLOOR_VOXELS_X, FLOOR_VOXELS_Z } from '@/world/generator/floor';

/**
 * World ↔ voxel coordinate helpers + block-id readback (M8 wiring).
 *
 * The R3F runtime (Game.tsx) needs to translate a world-space tap
 * point — produced by PlayerKinematic.getTapWorld via floor-plane
 * raycast — into a voxel coordinate on the active floor's chunk grid,
 * then read the block id at that voxel so the radial classifier
 * (src/input/surfaceKind.ts) can pick the right options table.
 *
 * Constants mirror ChunkLayer.tsx. VOXEL_SIZE 0.4u; the maze center
 * voxel (31, _, 31) sits at world origin so the world→voxel map is
 * `vx = round((wx - ORIGIN) / VOXEL_SIZE)`.
 */

export const VOXEL_SIZE = 0.4;
export const VOXEL_CENTER_X = 31;
export const VOXEL_CENTER_Z = 31;
export const ORIGIN = -VOXEL_CENTER_X * VOXEL_SIZE;

export interface VoxelCoord {
	x: number;
	y: number;
	z: number;
}

export interface WorldCoord {
	x: number;
	y: number;
	z: number;
}

export function worldToVoxel(world: WorldCoord, y = 2): VoxelCoord {
	return {
		x: Math.round((world.x - ORIGIN) / VOXEL_SIZE),
		y,
		z: Math.round((world.z - ORIGIN) / VOXEL_SIZE),
	};
}

export function voxelToWorld(v: VoxelCoord): WorldCoord {
	return {
		x: ORIGIN + v.x * VOXEL_SIZE,
		y: v.y * VOXEL_SIZE,
		z: ORIGIN + v.z * VOXEL_SIZE,
	};
}

/** Read the block id at a voxel from a floor's chunk array. Returns 0
 *  (= air per BLOCK_IDS) if out of bounds; callers can treat that as
 *  no-op the same way an air hit is no-op. */
export function blockIdAt(chunks: readonly ChunkData[], v: VoxelCoord): number {
	if (v.x < 0 || v.x >= FLOOR_VOXELS_X) return 0;
	if (v.z < 0 || v.z >= FLOOR_VOXELS_Z) return 0;
	if (v.y < 0 || v.y >= CHUNK_SIZE) return 0;
	const cx = Math.floor(v.x / CHUNK_SIZE);
	const cz = Math.floor(v.z / CHUNK_SIZE);
	const lx = v.x - cx * CHUNK_SIZE;
	const lz = v.z - cz * CHUNK_SIZE;
	const idx = cz * FLOOR_CHUNKS_X + cx;
	const chunk = chunks[idx];
	if (!chunk) return 0;
	return chunk.get(lx, v.y, lz);
}

/** Mutate a voxel (used by mine/place wiring). Returns true on success. */
export function setBlockAt(chunks: readonly ChunkData[], v: VoxelCoord, id: number): boolean {
	if (v.x < 0 || v.x >= FLOOR_VOXELS_X) return false;
	if (v.z < 0 || v.z >= FLOOR_VOXELS_Z) return false;
	if (v.y < 0 || v.y >= CHUNK_SIZE) return false;
	const cx = Math.floor(v.x / CHUNK_SIZE);
	const cz = Math.floor(v.z / CHUNK_SIZE);
	const lx = v.x - cx * CHUNK_SIZE;
	const lz = v.z - cz * CHUNK_SIZE;
	const idx = cz * FLOOR_CHUNKS_X + cx;
	const chunk = chunks[idx];
	if (!chunk) return false;
	chunk.set(lx, v.y, lz, id);
	return true;
}
