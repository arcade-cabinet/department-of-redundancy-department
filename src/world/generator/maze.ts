import { createRng, type Rng } from './rng';

/**
 * Cubicle-grid maze generator. Ported from arcade-cabinet/Beppo-Laughs's
 * Growing Tree algorithm (`src/game/maze/core.ts`), retitled for the
 * office context: `MazeCell` → `Cubicle`, `removeWall` → `openPartition`,
 * `exits` → `stairwellDoors`. Uses the org-standard `Rng` interface from
 * `./rng` (which wraps `seedrandom` and matches mean-streets's pattern).
 *
 * Each cubicle is a single grid cell. Walls between cubicles are the
 * partition runs; an "open" wall = the cubicle's open side. The maze
 * carved from the centre outward leaves a tree of corridors connecting
 * every cubicle, plus four exits on the perimeter sides (these become
 * the floor's Up-Door, Down-Door, supply-closet door, and an extra side
 * exit reserved for PRQ-12 wiring).
 */

export type Direction = 'north' | 'south' | 'east' | 'west';

export interface Cubicle {
	x: number;
	y: number;
	walls: { north: boolean; south: boolean; east: boolean; west: boolean };
	visited: boolean;
	isCenter: boolean;
	isExit: boolean;
}

export interface Passage {
	from: { x: number; y: number };
	to: { x: number; y: number };
	direction: Direction;
}

export interface FloorMaze {
	width: number;
	height: number;
	cubicles: Cubicle[][];
	passages: Passage[];
	center: { x: number; y: number };
	exits: { x: number; y: number; side: Direction }[];
}

const OPPOSITE: Record<Direction, Direction> = {
	north: 'south',
	south: 'north',
	east: 'west',
	west: 'east',
};

export function generateFloorMaze(
	width: number,
	height: number,
	seedOrRng: string | Rng,
): FloorMaze {
	if (width % 2 === 0) width++;
	if (height % 2 === 0) height++;

	const centerX = Math.floor(width / 2);
	const centerY = Math.floor(height / 2);
	const rng: Rng = typeof seedOrRng === 'string' ? createRng(seedOrRng) : seedOrRng;

	const cubicles: Cubicle[][] = [];
	for (let y = 0; y < height; y++) {
		const row: Cubicle[] = [];
		for (let x = 0; x < width; x++) {
			row.push({
				x,
				y,
				walls: { north: true, south: true, east: true, west: true },
				visited: false,
				isCenter: x === centerX && y === centerY,
				isExit: false,
			});
		}
		cubicles.push(row);
	}

	const passages: Passage[] = [];
	const active: Cubicle[] = [];

	// biome-ignore lint/style/noNonNullAssertion: indices clamped by width/height
	const start = cubicles[centerY]![centerX]!;
	start.visited = true;
	active.push(start);

	while (active.length > 0) {
		// Growing Tree: 70% newest (Backtracking style), 30% random (Prim style).
		const pickIdx = rng.next() < 0.7 ? active.length - 1 : Math.floor(rng.next() * active.length);
		// biome-ignore lint/style/noNonNullAssertion: pickIdx in bounds by construction
		const current = active[pickIdx]!;
		const neighbors = unvisitedNeighbors(current, cubicles, width, height);

		if (neighbors.length === 0) {
			active.splice(pickIdx, 1);
			continue;
		}

		const choice = rng.pick(neighbors);
		openPartition(current, choice.cell, choice.direction);
		passages.push({
			from: { x: current.x, y: current.y },
			to: { x: choice.cell.x, y: choice.cell.y },
			direction: choice.direction,
		});
		choice.cell.visited = true;
		active.push(choice.cell);
	}

	const exits = carveExits(cubicles, width, height, rng);

	return {
		width,
		height,
		cubicles,
		passages,
		center: { x: centerX, y: centerY },
		exits,
	};
}

function unvisitedNeighbors(
	c: Cubicle,
	cubicles: Cubicle[][],
	width: number,
	height: number,
): { cell: Cubicle; direction: Direction }[] {
	const out: { cell: Cubicle; direction: Direction }[] = [];
	const dirs: { dx: number; dy: number; direction: Direction }[] = [
		{ dx: 0, dy: -1, direction: 'north' },
		{ dx: 0, dy: 1, direction: 'south' },
		{ dx: 1, dy: 0, direction: 'east' },
		{ dx: -1, dy: 0, direction: 'west' },
	];
	for (const { dx, dy, direction } of dirs) {
		const nx = c.x + dx;
		const ny = c.y + dy;
		if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
		const neighbor = cubicles[ny]?.[nx];
		if (neighbor && !neighbor.visited) out.push({ cell: neighbor, direction });
	}
	return out;
}

function openPartition(from: Cubicle, to: Cubicle, direction: Direction): void {
	from.walls[direction] = false;
	to.walls[OPPOSITE[direction]] = false;
}

function carveExits(
	cubicles: Cubicle[][],
	width: number,
	height: number,
	rng: Rng,
): { x: number; y: number; side: Direction }[] {
	const exits: { x: number; y: number; side: Direction }[] = [];
	const sides: Direction[] = ['north', 'south', 'east', 'west'];
	for (const side of sides) {
		let candidates: Cubicle[] = [];
		if (side === 'north') candidates = (cubicles[0] ?? []).slice(1, -1);
		else if (side === 'south') candidates = (cubicles[height - 1] ?? []).slice(1, -1);
		else if (side === 'west')
			candidates = cubicles
				.slice(1, -1)
				.map((row) => row[0])
				.filter((c): c is Cubicle => c !== undefined);
		else
			candidates = cubicles
				.slice(1, -1)
				.map((row) => row[width - 1])
				.filter((c): c is Cubicle => c !== undefined);

		if (candidates.length === 0) continue;
		const exit = rng.pick(candidates);
		exit.isExit = true;
		exit.walls[side] = false;
		exits.push({ x: exit.x, y: exit.y, side });
	}
	return exits;
}

/** Inspect open passages from a given cell. Useful for navigation. */
export function getConnections(
	maze: FloorMaze,
	x: number,
	y: number,
): { x: number; y: number; direction: Direction }[] {
	const cell = maze.cubicles[y]?.[x];
	if (!cell) return [];
	const out: { x: number; y: number; direction: Direction }[] = [];
	if (!cell.walls.north && y > 0) out.push({ x, y: y - 1, direction: 'north' });
	if (!cell.walls.south && y < maze.height - 1) out.push({ x, y: y + 1, direction: 'south' });
	if (!cell.walls.west && x > 0) out.push({ x: x - 1, y, direction: 'west' });
	if (!cell.walls.east && x < maze.width - 1) out.push({ x: x + 1, y, direction: 'east' });
	return out;
}
