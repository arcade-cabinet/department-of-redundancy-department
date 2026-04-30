import { useMemo } from 'react';
import { BLOCK_IDS, type BlockSlug } from '@/world/blocks/BlockRegistry';
import { Chunk } from '@/world/chunk/Chunk';
import { CHUNK_SIZE } from '@/world/chunk/ChunkData';
import { FLOOR_CHUNKS_X, generateFloor } from '@/world/generator/floor';

type Props = {
	seed: string;
	floor?: number;
	/** World-space size of one voxel in meters. Spec §1: 0.4u so 16-voxel
	 *  chunks read at 6.4u each, matching the ~2.6u-cubicle footprint
	 *  scaled up roughly 9× to fit 7 cubicles in 64 voxels. */
	voxelSize?: number;
	/** Per-floor placement overlay (PRQ-11 T1+T5 wiring, M2c4). Map of
	 *  `${vx},${vy},${vz}` voxel-key → BlockSlug. ChunkLayer applies
	 *  these on top of the freshly generated baseline so placements
	 *  survive seed/floor regen until M3 wires drizzle persistence. */
	placements?: ReadonlyMap<string, BlockSlug>;
};

/** Voxel coordinates of the maze center cubicle's center cell.
 *  7×7 maze → center cubicle (3,3); 9-voxel footprint → center voxel
 *  is at `3*9+4 = 31` per axis. Exported so World/Game can place the
 *  player + manager at the cubicle center via `position=[0, ..., 0]`. */
export const VOXEL_CENTER_X = 31;
export const VOXEL_CENTER_Z = 31;

/**
 * Mounts every chunk produced by the seeded floor generator. Replaces
 * the static `<Floor/>` + `<Ceiling/>` + maze-walls of the PRQ-02 demo
 * with a chunked voxel world.
 *
 * The world is positioned so voxel (VOXEL_CENTER_X, _, VOXEL_CENTER_Z)
 * — the center of the maze's center cubicle — sits at world origin.
 * Anything wanting to spawn there just uses `[0, _, 0]`.
 *
 * View-distance culling lands later (PRQ-18 perf pass); for now we
 * mount every chunk on the active floor (16 chunks × ~6 draws each ≤
 * spec §12 budget of 250).
 */
export function ChunkLayer({ seed, floor = 1, voxelSize = 0.4, placements }: Props) {
	const result = useMemo(() => {
		const r = generateFloor(seed, floor);
		// Apply session placements on top of the pristine baseline.
		// Placement keys are global voxel coords; map back to chunk-local.
		if (placements) {
			for (const [key, slug] of placements) {
				const [vx, vy, vz] = key.split(',').map(Number) as [number, number, number];
				const id = BLOCK_IDS[slug];
				if (id === undefined) continue;
				const cx = Math.floor(vx / CHUNK_SIZE);
				const cz = Math.floor(vz / CHUNK_SIZE);
				const lx = vx - cx * CHUNK_SIZE;
				const lz = vz - cz * CHUNK_SIZE;
				const idx = cz * FLOOR_CHUNKS_X + cx;
				const chunk = r.chunks[idx];
				if (!chunk) continue;
				chunk.set(lx, vy, lz, id);
			}
			for (const c of r.chunks) c.clearDirty();
		}
		return r;
	}, [seed, floor, placements]);

	// Translate by -voxelCenter so the maze center voxel lands at world (0, 0, 0).
	const offsetX = -VOXEL_CENTER_X * voxelSize;
	const offsetZ = -VOXEL_CENTER_Z * voxelSize;

	return (
		<group scale={[voxelSize, voxelSize, voxelSize]} position={[offsetX, 0, offsetZ]}>
			{result.chunks.map((chunk, i) => {
				const cx = i % FLOOR_CHUNKS_X;
				const cz = Math.floor(i / FLOOR_CHUNKS_X);
				return (
					<Chunk key={`chunk-${cx}-${cz}-${floor}`} chunk={chunk} origin={[cx * 16, 0, cz * 16]} />
				);
			})}
		</group>
	);
}
