import { useGLTF } from '@react-three/drei';
import type { Manifest } from '@/content/manifest';
import { Character } from '@/render/characters/Character';
import { Ceiling } from './Ceiling';
import { ChunkLayer } from './ChunkLayer';
import { CubicleMaze } from './CubicleMaze';
import { Floor } from './Floor';

type Props = {
	manifest: Manifest;
	seed: string;
	/** Active floor index. Drives ChunkLayer regeneration on swap (PRQ-12). */
	floor?: number;
	/** When true, render the chunked voxel world (PRQ-03+). When false,
	 *  the original PRQ-02 mesh-walled demo. Default: true. */
	voxels?: boolean;
};

const CEILING_HEIGHT = 2.6;
const GRID_W = 7;
const GRID_H = 7;
const CELL_SIZE = 2.6;
// World extent must cover the entire maze (PRQ-02 path).
const FLOOR_EXTENT = Math.max(GRID_W, GRID_H) * CELL_SIZE + 2;

useGLTF.preload('/assets/models/props/desk.glb');

/**
 * The active world. Default mode (voxels=true, PRQ-03+) renders a
 * chunked voxel floor via `<ChunkLayer/>`; the manager character spawns
 * at the world origin (center of the voxel floor). Legacy mode
 * (voxels=false) preserves the PRQ-02 mesh-walled demo for visual
 * regression comparisons until the voxel renderer fully supersedes it.
 */
// Carpet floor occupies voxel y=0..1. Top surface in world space is
// (FLOOR_FLOOR_Y_TOP + 1) * voxelSize = 2 * 0.4 = 0.8 — the y where
// a character or player's feet should sit so they don't clip the slab.
const VOXEL_FLOOR_TOP_Y = 0.8;

export function World({ manifest, seed, floor = 1, voxels = true }: Props) {
	if (voxels) {
		return (
			<>
				<ChunkLayer seed={seed} floor={floor} />
				<Character slug="middle-manager" manifest={manifest} position={[0, VOXEL_FLOOR_TOP_Y, 0]} />
			</>
		);
	}
	return (
		<>
			<Floor size={[FLOOR_EXTENT, FLOOR_EXTENT]} repeat={Math.ceil(FLOOR_EXTENT / 4)} />
			<Ceiling
				size={[FLOOR_EXTENT, FLOOR_EXTENT]}
				height={CEILING_HEIGHT}
				repeat={Math.ceil(FLOOR_EXTENT / 4)}
			/>
			<CubicleMaze
				manifest={manifest}
				seed={seed}
				gridWidth={GRID_W}
				gridHeight={GRID_H}
				cellSize={CELL_SIZE}
				wallHeight={CEILING_HEIGHT - 0.01}
				ceilingHeight={CEILING_HEIGHT}
			/>
		</>
	);
}
