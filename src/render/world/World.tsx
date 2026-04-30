import { useGLTF } from '@react-three/drei';
import type { Manifest } from '@/content/manifest';
import { Ceiling } from './Ceiling';
import { CubicleMaze } from './CubicleMaze';
import { Floor } from './Floor';

type Props = {
	manifest: Manifest;
	seed: string;
};

const CEILING_HEIGHT = 2.6;
const GRID_W = 7;
const GRID_H = 7;
const CELL_SIZE = 2.6;
// World extent must cover the entire maze.
const FLOOR_EXTENT = Math.max(GRID_W, GRID_H) * CELL_SIZE + 2;

useGLTF.preload('/assets/models/props/desk.glb');

/**
 * The PRQ-02 demo scene: a procedurally generated cubicle maze (Beppo
 * Growing-Tree algorithm seeded by the world seed). One cubicle per
 * grid cell, partitions form the maze walls, perimeter exits become
 * the four side stairwell-doors. The center cubicle hosts the manager
 * + ceiling fixture.
 */
export function World({ manifest, seed }: Props) {
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
				wallHeight={1.2}
			/>
		</>
	);
}
