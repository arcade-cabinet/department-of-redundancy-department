import { describe, expect, it } from 'vitest';
import { generateFloorMaze, getConnections } from './maze';
import { createRng, generateSeedPhrase, pickCubicleLabel } from './rng';

describe('generateFloorMaze', () => {
	it('produces deterministic output for the same seed', () => {
		const a = generateFloorMaze(7, 7, 'Synergistic Bureaucratic Cubicle');
		const b = generateFloorMaze(7, 7, 'Synergistic Bureaucratic Cubicle');
		expect(JSON.stringify(a)).toBe(JSON.stringify(b));
	});

	it('produces different output for different seeds', () => {
		const a = generateFloorMaze(7, 7, 'Drab Pointless Memo');
		const b = generateFloorMaze(7, 7, 'Bleak Compliant Filing');
		expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
	});

	it('rounds even sizes up to odd so a center cell exists', () => {
		const maze = generateFloorMaze(6, 8, 'seed');
		expect(maze.width).toBe(7);
		expect(maze.height).toBe(9);
		expect(maze.center).toEqual({ x: 3, y: 4 });
	});

	it('every cubicle is reachable from the center (full carve)', () => {
		const maze = generateFloorMaze(7, 7, 'reachability');
		const seen = new Set<string>();
		const queue: { x: number; y: number }[] = [maze.center];
		seen.add(`${maze.center.x},${maze.center.y}`);
		while (queue.length > 0) {
			const cur = queue.shift();
			if (!cur) break;
			for (const c of getConnections(maze, cur.x, cur.y)) {
				const k = `${c.x},${c.y}`;
				if (!seen.has(k)) {
					seen.add(k);
					queue.push({ x: c.x, y: c.y });
				}
			}
		}
		expect(seen.size).toBe(maze.width * maze.height);
	});

	it('exposes 4 perimeter exits (one per side)', () => {
		const maze = generateFloorMaze(7, 7, 'exits');
		const sides = new Set(maze.exits.map((e) => e.side));
		expect(sides.size).toBe(4);
		expect(maze.exits).toHaveLength(4);
	});
});

describe('Rng + seed phrase', () => {
	it('generateSeedPhrase produces a stable 3-word string for same seed', () => {
		const rng1 = createRng('seed-x');
		const rng2 = createRng('seed-x');
		expect(generateSeedPhrase(rng1)).toBe(generateSeedPhrase(rng2));
	});

	it('pickCubicleLabel returns an Adjective+Noun', () => {
		const rng = createRng('label');
		const label = pickCubicleLabel(rng);
		expect(label).toMatch(/^[A-Z][\w-]+ [A-Z][\w-]+$/);
	});
});
