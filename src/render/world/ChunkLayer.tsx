import { useMemo } from 'react';
import { Chunk } from '@/world/chunk/Chunk';
import {
	FLOOR_CHUNKS_X,
	FLOOR_VOXELS_X,
	FLOOR_VOXELS_Z,
	generateFloor,
} from '@/world/generator/floor';

type Props = {
	seed: string;
	floor?: number;
	/** World-space size of one voxel in meters. Spec §1: 0.4u so 16-voxel
	 *  chunks read at 6.4u each, matching the ~2.6u-cubicle footprint
	 *  scaled up roughly 9× to fit 7 cubicles in 64 voxels. */
	voxelSize?: number;
};

/**
 * Mounts every chunk produced by the seeded floor generator. Replaces
 * the static `<Floor/>` + `<Ceiling/>` + maze-walls of the PRQ-02 demo
 * with a chunked voxel world.
 *
 * This component is pure projection: the generator is deterministic,
 * the chunk meshes are memoized, and re-rendering with the same
 * `(seed, floor)` is a no-op.
 *
 * View-distance culling lands in PRQ-03 T5 alongside the draw-call HUD;
 * for now we mount every chunk on the active floor (16 chunks × ~6
 * draws each ≤ spec §12 budget of 250).
 */
export function ChunkLayer({ seed, floor = 1, voxelSize = 0.4 }: Props) {
	const result = useMemo(() => generateFloor(seed, floor), [seed, floor]);

	return (
		<group
			scale={[voxelSize, voxelSize, voxelSize]}
			// Center the floor on the world origin: 64 voxels × voxelSize
			// is the floor extent; subtract half so x∈[-extent/2, +extent/2].
			position={[(-FLOOR_VOXELS_X / 2) * voxelSize, 0, (-FLOOR_VOXELS_Z / 2) * voxelSize]}
		>
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
