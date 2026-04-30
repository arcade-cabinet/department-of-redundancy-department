import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, it } from 'vitest';
import {
	advance,
	createRail,
	currentLookAt,
	currentNode,
	currentPosition,
	progress,
	resumeFromCombat,
} from './Rail';
import { type RailGraph, type RailNode, railLength, segmentSpeed } from './RailNode';

function node(id: string, kind: RailNode['kind'], x: number, dwellMs?: number): RailNode {
	const base = {
		id,
		kind,
		position: new Vector3(x, 0, 0),
		lookAt: new Vector3(x, 0, -1),
	};
	return dwellMs === undefined ? base : { ...base, dwellMs };
}

function straightGraph(speedUps = 10): RailGraph {
	return {
		defaultSpeedUps: speedUps,
		nodes: [node('a', 'glide', 0), node('b', 'glide', 10), node('c', 'glide', 20)],
	};
}

describe('RailNode helpers', () => {
	it('railLength sums segments', () => {
		expect(railLength(straightGraph())).toBe(20);
	});

	it('segmentSpeed honors per-segment override', () => {
		const graph: RailGraph = {
			...straightGraph(10),
			segmentSpeeds: [5, undefined],
		};
		expect(segmentSpeed(graph, 0)).toBe(5);
		expect(segmentSpeed(graph, 1)).toBe(10);
	});
});

describe('createRail', () => {
	it('starts at index 0, t=0, gliding', () => {
		const rail = createRail(straightGraph());
		expect(rail.nodeIndex).toBe(0);
		expect(rail.segmentT).toBe(0);
		expect(rail.phase).toBe('gliding');
		expect(rail.dwellRemainingMs).toBe(0);
	});

	it('throws on graphs with fewer than 2 nodes', () => {
		expect(() => createRail({ defaultSpeedUps: 10, nodes: [node('a', 'glide', 0)] })).toThrow();
	});
});

describe('advance — gliding', () => {
	it('progresses monotonically along the first segment', () => {
		let rail = createRail(straightGraph(10));
		const xs: number[] = [];
		for (let i = 0; i < 10; i++) {
			rail = advance(rail, 100);
			xs.push(currentPosition(rail).x);
		}
		for (let i = 1; i < xs.length; i++) {
			// biome-ignore lint/style/noNonNullAssertion: bounded loop
			expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]!);
		}
	});

	it('crosses a node boundary cleanly', () => {
		let rail = createRail(straightGraph(10));
		rail = advance(rail, 1000);
		expect(rail.nodeIndex).toBe(1);
		expect(rail.segmentT).toBe(0);
		expect(rail.phase).toBe('gliding');
		expect(currentPosition(rail).x).toBe(10);
	});

	it('overflow carries into the next segment', () => {
		let rail = createRail(straightGraph(10));
		rail = advance(rail, 1500);
		expect(rail.nodeIndex).toBe(1);
		expect(rail.segmentT).toBeCloseTo(0.5, 5);
		expect(currentPosition(rail).x).toBeCloseTo(15, 5);
	});

	it('reaches finished after traversing all segments', () => {
		let rail = createRail(straightGraph(10));
		rail = advance(rail, 5000);
		expect(rail.phase).toBe('finished');
		expect(currentPosition(rail).x).toBe(20);
	});

	it('advance is a no-op when finished', () => {
		let rail = createRail(straightGraph(10));
		rail = advance(rail, 5000);
		const before = rail;
		const after = advance(rail, 1000);
		expect(after).toBe(before);
	});

	it('zero dt returns the same reference', () => {
		const rail = createRail(straightGraph(10));
		expect(advance(rail, 0)).toBe(rail);
	});
});

describe('advance — combat dwell', () => {
	function combatGraph(): RailGraph {
		return {
			defaultSpeedUps: 10,
			nodes: [
				node('start', 'glide', 0),
				node('pos1', 'combat', 10, 5000),
				node('end', 'glide', 20),
			],
		};
	}

	it('enters dwell on arrival at combat node', () => {
		let rail = createRail(combatGraph());
		rail = advance(rail, 1000);
		expect(rail.phase).toBe('dwelling');
		expect(rail.dwellRemainingMs).toBe(5000);
		expect(rail.nodeIndex).toBe(1);
	});

	it('counts dwell down', () => {
		let rail = createRail(combatGraph());
		rail = advance(rail, 1000);
		rail = advance(rail, 2000);
		expect(rail.phase).toBe('dwelling');
		expect(rail.dwellRemainingMs).toBe(3000);
	});

	it('exits dwell after authored duration and resumes gliding', () => {
		let rail = createRail(combatGraph());
		rail = advance(rail, 1000);
		rail = advance(rail, 5000);
		expect(rail.phase).toBe('gliding');
		expect(rail.dwellRemainingMs).toBe(0);
	});

	it('overflow past dwell exit applies to the next segment', () => {
		let rail = createRail(combatGraph());
		rail = advance(rail, 1000);
		rail = advance(rail, 6000);
		expect(rail.phase).toBe('finished');
	});

	it('resumeFromCombat clears the dwell early', () => {
		let rail = createRail(combatGraph());
		rail = advance(rail, 1000);
		rail = advance(rail, 1000);
		rail = resumeFromCombat(rail);
		expect(rail.phase).toBe('gliding');
		expect(rail.dwellRemainingMs).toBe(0);
		expect(rail.segmentT).toBe(0);
	});

	it('resumeFromCombat is a no-op while gliding', () => {
		const rail = createRail(combatGraph());
		expect(resumeFromCombat(rail)).toBe(rail);
	});
});

describe('currentPosition / currentLookAt', () => {
	it('interpolates position while gliding', () => {
		let rail = createRail(straightGraph(10));
		rail = advance(rail, 500);
		expect(currentPosition(rail).x).toBeCloseTo(5, 5);
	});

	it('interpolates lookAt while gliding', () => {
		let rail = createRail(straightGraph(10));
		rail = advance(rail, 500);
		expect(currentLookAt(rail).x).toBeCloseTo(5, 5);
		expect(currentLookAt(rail).z).toBeCloseTo(-1, 5);
	});

	it('snaps to node position while dwelling', () => {
		const graph: RailGraph = {
			defaultSpeedUps: 10,
			nodes: [node('a', 'glide', 0), node('b', 'combat', 10, 1000), node('c', 'glide', 20)],
		};
		let rail = createRail(graph);
		rail = advance(rail, 1000);
		expect(rail.phase).toBe('dwelling');
		expect(currentPosition(rail).x).toBe(10);
	});

	it('snaps to last node when finished', () => {
		let rail = createRail(straightGraph(10));
		rail = advance(rail, 99999);
		expect(currentPosition(rail).x).toBe(20);
	});
});

describe('progress', () => {
	it('reports nodeIndex / segmentT / phase', () => {
		let rail = createRail(straightGraph(10));
		rail = advance(rail, 250);
		const p = progress(rail);
		expect(p.nodeIndex).toBe(0);
		expect(p.segmentT).toBeCloseTo(0.25, 5);
		expect(p.phase).toBe('gliding');
	});
});

describe('currentNode', () => {
	it('returns starting node before any advance', () => {
		const rail = createRail(straightGraph());
		expect(currentNode(rail).id).toBe('a');
	});

	it('returns the new node after crossing a boundary', () => {
		let rail = createRail(straightGraph(10));
		rail = advance(rail, 1000);
		expect(currentNode(rail).id).toBe('b');
	});
});

describe('degenerate segments', () => {
	it('zero-length segment passes through immediately', () => {
		const graph: RailGraph = {
			defaultSpeedUps: 10,
			nodes: [node('a', 'glide', 0), node('b', 'glide', 0), node('c', 'glide', 10)],
		};
		let rail = createRail(graph);
		rail = advance(rail, 1000);
		expect(rail.phase).toBe('finished');
	});

	it('zero-dwell combat node does not stall', () => {
		const graph: RailGraph = {
			defaultSpeedUps: 10,
			nodes: [node('a', 'glide', 0), node('b', 'combat', 10, 0), node('c', 'glide', 20)],
		};
		let rail = createRail(graph);
		rail = advance(rail, 2000);
		expect(rail.phase).toBe('finished');
	});
});
