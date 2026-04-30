import { BLOCK_IDS } from '../blocks/BlockRegistry';
import { CHUNK_SIZE, ChunkData } from '../chunk/ChunkData';
import { type FloorMaze, generateFloorMaze } from './maze';
import { createRng, type Rng } from './rng';

/**
 * Per-floor world generator. Produces a 4×4 grid of chunks (64×64×16
 * voxels = one floor) from a `(seed, floor)` pair. Deterministic: same
 * inputs always produce identical chunk buffers, so the saved seed
 * replays the world exactly across reloads.
 *
 * Layout:
 *   - Y=0..1: solid carpet floor (2-voxel thickness for raycast headroom).
 *   - Y=14..15: ceiling tiles (2 voxels).
 *   - Y=2..13 (12 voxels): interior. Cubicle walls run from floor to
 *     ceiling per the maze generator's `walls` flags. No gaps —
 *     a maze is a maze (per spec §4 + project guidance).
 *
 * The maze generator carves a 7×7 cubicle grid; each cubicle is voxelized
 * to a 9×9 horizontal cell footprint with 1-voxel-thick walls — that
 * fits 7×9=63 voxels per axis, just shy of the 64-voxel floor extent
 * (the missing voxel at the perimeter becomes the outer hallway).
 */

export const FLOOR_CHUNKS_X = 4;
export const FLOOR_CHUNKS_Z = 4;
export const FLOOR_VOXELS_X = FLOOR_CHUNKS_X * CHUNK_SIZE; // 64
export const FLOOR_VOXELS_Z = FLOOR_CHUNKS_Z * CHUNK_SIZE; // 64

/** Voxel y-index range for the carpet floor (inclusive). */
export const FLOOR_FLOOR_Y = 0;
export const FLOOR_FLOOR_Y_TOP = 1;
/** Voxel y-index range for the ceiling tile (inclusive). */
export const FLOOR_CEILING_Y_BOT = 14;
export const FLOOR_CEILING_Y = 15;

/** Cubicle grid dimensions on this floor — must be odd per maze.ts. */
const MAZE_W = 7;
const MAZE_H = 7;
/** Voxel footprint per cubicle. With 9×9 cells × 7 cubicles = 63 voxels,
 *  leaves a 1-voxel hallway band on the +x / +z perimeter. */
const CUBICLE_FOOTPRINT = 9;

export interface DoorCoord {
	x: number;
	y: number;
	z: number;
}

export interface FloorResult {
	chunks: ChunkData[];
	maze: FloorMaze;
	floor: number;
	seed: string;
	/** Diagnostic: count of cubicle-wall voxels written. */
	wallCount: number;
	/** Stairwell door positions (PRQ-12). Up-Door of floor N takes the
	 *  player to Down-Door of floor N+1, and vice versa. Voxel coords
	 *  in floor-space (0..FLOOR_VOXELS_X-1, ...). */
	upDoor: DoorCoord;
	downDoor: DoorCoord;
}

/** Voxel y-row where door frames sit (ground level above the carpet). */
const DOOR_Y = FLOOR_FLOOR_Y_TOP + 1;

export function generateFloor(seed: string, floor: number): FloorResult {
	// Mix seed + floor so each floor has a distinct draw order while
	// world.seed alone uniquely identifies the run. Format mirrors how
	// mean-streets's per-track sub-RNGs key off the parent seed.
	const floorRng: Rng = createRng(`${seed}::floor-${floor}`);
	const maze = generateFloorMaze(MAZE_W, MAZE_H, floorRng);

	const chunks: ChunkData[] = [];
	for (let i = 0; i < FLOOR_CHUNKS_X * FLOOR_CHUNKS_Z; i++) chunks.push(new ChunkData());

	let wallCount = 0;
	wallCount += paintFloorAndCeiling(chunks);
	wallCount += paintMazeWalls(chunks, maze);

	// Place door frames at two distinct cubicle centers picked
	// deterministically. Use a per-consumer sub-Rng (`::doors`) so any
	// future change to maze draw count cannot silently shift door
	// positions and break replay determinism. Mirrors the per-scope
	// Rng pattern from rng.ts ("each scope gets its own Rng").
	const doorRng: Rng = createRng(`${seed}::floor-${floor}::doors`);
	const { up, down } = pickDoorCells(doorRng);
	const upDoor: DoorCoord = {
		x: up.gx * CUBICLE_FOOTPRINT + 4,
		y: DOOR_Y,
		z: up.gy * CUBICLE_FOOTPRINT + 4,
	};
	const downDoor: DoorCoord = {
		x: down.gx * CUBICLE_FOOTPRINT + 4,
		y: DOOR_Y,
		z: down.gy * CUBICLE_FOOTPRINT + 4,
	};
	writeVoxel(chunks, upDoor.x, upDoor.y, upDoor.z, BLOCK_IDS['up-door-frame']);
	writeVoxel(chunks, downDoor.x, downDoor.y, downDoor.z, BLOCK_IDS['down-door-frame']);

	for (const c of chunks) c.clearDirty();

	return { chunks, maze, floor, seed, wallCount, upDoor, downDoor };
}

/** Pick two distinct cubicle cells from the maze grid for the up/down
 *  doors. Order: up first, then down (independent draws). */
function pickDoorCells(rng: Rng): {
	up: { gx: number; gy: number };
	down: { gx: number; gy: number };
} {
	const ux = rng.int(0, MAZE_W - 1);
	const uy = rng.int(0, MAZE_H - 1);
	let dx: number;
	let dy: number;
	// Re-roll until we land on a cubicle distinct from up. Rng is
	// uniform so worst-case expected draws ≈ 1/(1 - 1/49) ≈ 1.02.
	do {
		dx = rng.int(0, MAZE_W - 1);
		dy = rng.int(0, MAZE_H - 1);
	} while (dx === ux && dy === uy);
	return { up: { gx: ux, gy: uy }, down: { gx: dx, gy: dy } };
}

function chunkAt(chunks: ChunkData[], cx: number, cz: number): ChunkData {
	const idx = cz * FLOOR_CHUNKS_X + cx;
	const c = chunks[idx];
	if (!c) throw new Error(`chunk index ${idx} out of range`);
	return c;
}

function paintFloorAndCeiling(chunks: ChunkData[]): number {
	let n = 0;
	for (let cz = 0; cz < FLOOR_CHUNKS_Z; cz++) {
		for (let cx = 0; cx < FLOOR_CHUNKS_X; cx++) {
			const c = chunkAt(chunks, cx, cz);
			for (let z = 0; z < CHUNK_SIZE; z++) {
				for (let x = 0; x < CHUNK_SIZE; x++) {
					c.set(x, FLOOR_FLOOR_Y, z, BLOCK_IDS['carpet-floor']);
					c.set(x, FLOOR_FLOOR_Y_TOP, z, BLOCK_IDS['carpet-floor']);
					c.set(x, FLOOR_CEILING_Y_BOT, z, BLOCK_IDS['ceiling-tile']);
					c.set(x, FLOOR_CEILING_Y, z, BLOCK_IDS['ceiling-tile']);
					n += 4;
				}
			}
		}
	}
	return n;
}

function paintMazeWalls(chunks: ChunkData[], maze: FloorMaze): number {
	let n = 0;
	const wallYStart = FLOOR_FLOOR_Y_TOP + 1; // 2
	const wallYEnd = FLOOR_CEILING_Y_BOT - 1; // 13
	for (let gy = 0; gy < maze.height; gy++) {
		for (let gx = 0; gx < maze.width; gx++) {
			const cell = maze.cubicles[gy]?.[gx];
			if (!cell) continue;
			const baseX = gx * CUBICLE_FOOTPRINT;
			const baseZ = gy * CUBICLE_FOOTPRINT;
			n += paintCellWalls(chunks, cell.walls, baseX, baseZ, wallYStart, wallYEnd);
		}
	}
	return n;
}

function paintCellWalls(
	chunks: ChunkData[],
	walls: { north: boolean; south: boolean; east: boolean; west: boolean },
	baseX: number,
	baseZ: number,
	wallYStart: number,
	wallYEnd: number,
): number {
	let n = 0;
	const id = BLOCK_IDS['cubicle-wall'];
	for (let y = wallYStart; y <= wallYEnd; y++) {
		if (walls.north) n += paintXRun(chunks, baseX, y, baseZ, id);
		if (walls.south) n += paintXRun(chunks, baseX, y, baseZ + CUBICLE_FOOTPRINT - 1, id);
		if (walls.west) n += paintZRun(chunks, baseX, y, baseZ, id);
		if (walls.east) n += paintZRun(chunks, baseX + CUBICLE_FOOTPRINT - 1, y, baseZ, id);
	}
	return n;
}

function paintXRun(chunks: ChunkData[], x0: number, y: number, z: number, id: number): number {
	let n = 0;
	for (let dx = 0; dx < CUBICLE_FOOTPRINT; dx++) n += writeVoxel(chunks, x0 + dx, y, z, id);
	return n;
}

function paintZRun(chunks: ChunkData[], x: number, y: number, z0: number, id: number): number {
	let n = 0;
	for (let dz = 0; dz < CUBICLE_FOOTPRINT; dz++) n += writeVoxel(chunks, x, y, z0 + dz, id);
	return n;
}

/** Translate a floor-space voxel coord into the right chunk + local
 *  coords. Returns 1 if a voxel was written (in-range), 0 if dropped. */
function writeVoxel(chunks: ChunkData[], wx: number, wy: number, wz: number, id: number): number {
	if (wx < 0 || wx >= FLOOR_VOXELS_X || wz < 0 || wz >= FLOOR_VOXELS_Z) return 0;
	if (wy < 0 || wy >= CHUNK_SIZE) return 0;
	const cx = Math.floor(wx / CHUNK_SIZE);
	const cz = Math.floor(wz / CHUNK_SIZE);
	const lx = wx - cx * CHUNK_SIZE;
	const lz = wz - cz * CHUNK_SIZE;
	chunkAt(chunks, cx, cz).set(lx, wy, lz, id);
	return 1;
}
