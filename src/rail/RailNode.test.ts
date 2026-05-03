import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, test } from 'vitest';
import { type RailGraph, type RailNode, railLength, segmentSpeed } from './RailNode';

function node(id: string, x: number, y: number, z: number): RailNode {
	return { id, kind: 'glide', position: new Vector3(x, y, z), lookAt: Vector3.Zero() };
}

describe('railLength', () => {
	test('zero for a single node', () => {
		const graph: RailGraph = { nodes: [node('a', 0, 0, 0)], defaultSpeedUps: 1 };
		expect(railLength(graph)).toBe(0);
	});

	test('sums Euclidean distances along a straight path', () => {
		const graph: RailGraph = {
			nodes: [node('a', 0, 0, 0), node('b', 3, 0, 0), node('c', 3, 4, 0)],
			defaultSpeedUps: 1,
		};
		// 0→3 = 3, 3→3,4 = 4. Total 7.
		expect(railLength(graph)).toBeCloseTo(7, 6);
	});

	test('handles colinear back-and-forth (stays positive — uses absolute distance)', () => {
		const graph: RailGraph = {
			nodes: [node('a', 0, 0, 0), node('b', 5, 0, 0), node('c', 0, 0, 0)],
			defaultSpeedUps: 1,
		};
		expect(railLength(graph)).toBeCloseTo(10, 6);
	});

	test('handles 3D diagonal segments', () => {
		const graph: RailGraph = {
			nodes: [node('a', 0, 0, 0), node('b', 1, 2, 2)],
			defaultSpeedUps: 1,
		};
		// √(1 + 4 + 4) = 3
		expect(railLength(graph)).toBeCloseTo(3, 6);
	});
});

describe('segmentSpeed', () => {
	const graph: RailGraph = {
		nodes: [node('a', 0, 0, 0), node('b', 1, 0, 0), node('c', 2, 0, 0)],
		defaultSpeedUps: 5,
		segmentSpeeds: [undefined, 2.5],
	};

	test('falls back to defaultSpeedUps when no override at index', () => {
		expect(segmentSpeed(graph, 0)).toBe(5);
	});

	test('uses override when present', () => {
		expect(segmentSpeed(graph, 1)).toBe(2.5);
	});

	test('falls back to default when index past the override array', () => {
		expect(segmentSpeed(graph, 99)).toBe(5);
	});

	test('falls back when graph has no segmentSpeeds at all', () => {
		const noOverrides: RailGraph = { nodes: graph.nodes, defaultSpeedUps: 7 };
		expect(segmentSpeed(noOverrides, 0)).toBe(7);
	});
});
