import { Vector3 } from 'yuka';
import { BLOCK_REGISTRY } from '@/world/blocks/BlockRegistry';
import { CHUNK_SIZE, type ChunkData } from '@/world/chunk/ChunkData';
import { FLOOR_CHUNKS_X, FLOOR_VOXELS_X, FLOOR_VOXELS_Z } from '@/world/generator/floor';
import { createRng, type Rng } from '@/world/generator/rng';

/**
 * Per-floor enemy spawn director. Picks N walkable cells from the
 * floor's voxel grid using the same deterministic RNG track as the
 * floor generator, so the same (seed, floor) yields the same enemy
 * positions across reloads.
 *
 * "Walkable" is computed inline (mirrors `topWalkable` from the navmesh
 * builder) — we don't take a navmesh dependency here so the spawner
 * can run before the navmesh is built. The only constraint is that
 * the cell must have a walkable_top block and air above; FSM
 * pathfinding will filter further if a spawn ends up unreachable
 * (Investigate fails, manager idles in place — fine for alpha).
 *
 * Spec §19.2: ≥3 managers per floor. Plan T6: deterministic from
 * `(seed, floor)`. We seed the spawn RNG `${seed}::spawn::floor-${N}`
 * so it's a separate track from the floor-generation RNG.
 */

export interface SpawnPosition {
	world: Vector3; // ground-level world coords (y = ground top)
	voxel: { x: number; y: number; z: number };
}

export interface SpawnPlanInput {
	chunks: readonly ChunkData[];
	seed: string;
	floor: number;
	count: number;
	voxelSize: number;
	originX: number;
	originZ: number;
	/** Minimum distance (in voxels) between any two spawns. Avoids
	 *  managers spawning in the same cubicle. */
	minVoxelSeparation?: number;
}

export function planSpawns(input: SpawnPlanInput): SpawnPosition[] {
	const { chunks, seed, floor, count, voxelSize, originX, originZ, minVoxelSeparation = 6 } = input;
	const rng: Rng = createRng(`${seed}::spawn::floor-${floor}`);

	// Index every walkable column (x, z) → top voxel y.
	const candidates: { x: number; y: number; z: number }[] = [];
	for (let z = 0; z < FLOOR_VOXELS_Z; z++) {
		for (let x = 0; x < FLOOR_VOXELS_X; x++) {
			const top = topWalkable(chunks, x, z);
			if (top !== null) candidates.push({ x, y: top, z });
		}
	}
	if (candidates.length === 0) return [];

	const chosen: { x: number; y: number; z: number }[] = [];
	const minSepSq = minVoxelSeparation * minVoxelSeparation;
	// Reservoir-style with rejection: shuffle the candidates, then walk
	// taking any that satisfies the separation constraint until we have
	// `count`. Falls back to relaxing the constraint if the floor is
	// too small / cramped.
	const shuffled = rng.shuffle([...candidates]);
	for (const c of shuffled) {
		if (chosen.length >= count) break;
		const ok = chosen.every((other) => {
			const dx = other.x - c.x;
			const dz = other.z - c.z;
			return dx * dx + dz * dz >= minSepSq;
		});
		if (ok) chosen.push(c);
	}
	// Relax separation if we couldn't fill the quota (small / fragmented floor).
	while (chosen.length < count && shuffled.length >= count) {
		for (const c of shuffled) {
			if (chosen.length >= count) break;
			if (!chosen.includes(c)) chosen.push(c);
		}
	}

	return chosen.map((c) => ({
		voxel: c,
		world: new Vector3(
			originX + c.x * voxelSize,
			(c.y + 1) * voxelSize, // top of the supporting block
			originZ + c.z * voxelSize,
		),
	}));
}

function topWalkable(chunks: readonly ChunkData[], x: number, z: number): number | null {
	const cx = Math.floor(x / CHUNK_SIZE);
	const cz = Math.floor(z / CHUNK_SIZE);
	const chunk = chunks[cz * FLOOR_CHUNKS_X + cx];
	if (!chunk) return null;
	const lx = x - cx * CHUNK_SIZE;
	const lz = z - cz * CHUNK_SIZE;
	for (let y = CHUNK_SIZE - 1; y >= 0; y--) {
		const id = chunk.get(lx, y, lz);
		const block = BLOCK_REGISTRY[id];
		if (!block?.walkableTop) continue;
		if (y + 1 < CHUNK_SIZE) {
			const above = chunk.get(lx, y + 1, lz);
			if (BLOCK_REGISTRY[above]?.solid) continue;
		}
		return y;
	}
	return null;
}
