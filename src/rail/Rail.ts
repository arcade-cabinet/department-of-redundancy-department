import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { type RailGraph, type RailNode, segmentSpeed } from './RailNode';

/**
 * Immutable state describing where the camera currently is along a
 * `RailGraph`. The encounter director reads `currentPosition` /
 * `currentLookAt` each frame and applies them to the active Babylon
 * camera.
 *
 * Progression model:
 *
 * - Between two adjacent nodes, the camera moves at the segment's
 *   authored speed in world-units-per-second; `segmentT` ∈ [0, 1]
 *   interpolates `nodes[index]` → `nodes[index + 1]`.
 * - On arrival at a `combat` node, `dwellRemainingMs` counts down
 *   the authored dwell. Calling `resumeFromCombat` after the director
 *   clears the position lets the rail resume early.
 * - On arrival at the final node, the rail enters `phase: 'finished'`
 *   and `advance` becomes a no-op.
 *
 * Every transition is pure: `advance` returns a new state, never
 * mutates the input.
 */
export type RailPhase = 'gliding' | 'dwelling' | 'finished';

export interface RailState {
	readonly graph: RailGraph;
	readonly phase: RailPhase;
	/** Index of the segment leaving this node. Equals `graph.nodes.length - 1` when finished. */
	readonly nodeIndex: number;
	/** Progress along the current segment, [0, 1]. 0 when dwelling or finished. */
	readonly segmentT: number;
	/** Milliseconds left to dwell at the current `combat` node; 0 otherwise. */
	readonly dwellRemainingMs: number;
}

export function createRail(graph: RailGraph): RailState {
	if (graph.nodes.length < 2) {
		throw new Error('createRail: graph must have at least 2 nodes');
	}
	return {
		graph,
		phase: 'gliding',
		nodeIndex: 0,
		segmentT: 0,
		dwellRemainingMs: 0,
	};
}

/**
 * Advance the rail by `dtMs` milliseconds. Pure — returns a new state.
 *
 * Handles glide → combat-node-arrival → dwell → resume → glide chains
 * within a single tick if `dtMs` is large enough (e.g. a debugger
 * pause). Recursion bound is `graph.nodes.length`; no infinite loops.
 */
export function advance(state: RailState, dtMs: number): RailState {
	if (state.phase === 'finished' || dtMs <= 0) return state;

	if (state.phase === 'dwelling') {
		const remaining = state.dwellRemainingMs - dtMs;
		if (remaining > 0) {
			return { ...state, dwellRemainingMs: remaining };
		}
		const overflow = -remaining;
		const resumed = resumeAfterDwell(state);
		return overflow > 0 ? advance(resumed, overflow) : resumed;
	}

	const { graph, nodeIndex } = state;
	if (nodeIndex >= graph.nodes.length - 1) {
		return { ...state, phase: 'finished', segmentT: 0, dwellRemainingMs: 0 };
	}

	// biome-ignore lint/style/noNonNullAssertion: nodeIndex bounded above
	const from = graph.nodes[nodeIndex]!;
	// biome-ignore lint/style/noNonNullAssertion: nodeIndex+1 bounded above
	const to = graph.nodes[nodeIndex + 1]!;
	const segLength = Vector3.Distance(from.position, to.position);
	const speed = segmentSpeed(graph, nodeIndex);

	if (segLength === 0 || speed <= 0) {
		// Degenerate segment — collapse to arrival.
		return arriveAtNode(state, nodeIndex + 1, dtMs);
	}

	const dtSec = dtMs / 1000;
	const segDurationSec = segLength / speed;
	const tDelta = dtSec / segDurationSec;
	const newT = state.segmentT + tDelta;

	if (newT < 1) {
		return { ...state, segmentT: newT };
	}

	const overflowSec = (newT - 1) * segDurationSec;
	const overflowMs = overflowSec * 1000;
	return arriveAtNode(state, nodeIndex + 1, overflowMs);
}

/**
 * Skip the remaining dwell — called by the director when the active
 * combat position is cleared (all enemies dead, queue drained) before
 * the authored `dwellMs` elapses.
 */
export function resumeFromCombat(state: RailState): RailState {
	if (state.phase !== 'dwelling') return state;
	return resumeAfterDwell(state);
}

export function currentNode(state: RailState): RailNode {
	const idx = state.phase === 'finished' ? state.graph.nodes.length - 1 : state.nodeIndex;
	// biome-ignore lint/style/noNonNullAssertion: idx in bounds by construction
	return state.graph.nodes[idx]!;
}

export function currentPosition(state: RailState): Vector3 {
	if (state.phase !== 'gliding') {
		return currentNode(state).position.clone();
	}
	// biome-ignore lint/style/noNonNullAssertion: nodeIndex+1 valid while gliding
	const next = state.graph.nodes[state.nodeIndex + 1]!;
	return Vector3.Lerp(currentNode(state).position, next.position, state.segmentT);
}

export function currentLookAt(state: RailState): Vector3 {
	if (state.phase !== 'gliding') {
		return currentNode(state).lookAt.clone();
	}
	// biome-ignore lint/style/noNonNullAssertion: nodeIndex+1 valid while gliding
	const next = state.graph.nodes[state.nodeIndex + 1]!;
	return Vector3.Lerp(currentNode(state).lookAt, next.lookAt, state.segmentT);
}

export interface RailProgress {
	readonly nodeIndex: number;
	readonly segmentT: number;
	readonly phase: RailPhase;
}

export function progress(state: RailState): RailProgress {
	return {
		nodeIndex: state.nodeIndex,
		segmentT: state.segmentT,
		phase: state.phase,
	};
}

/** Internal — handle landing on `arrivedIndex` and apply any leftover dt. */
function arriveAtNode(state: RailState, arrivedIndex: number, overflowMs: number): RailState {
	const { graph } = state;
	const isLast = arrivedIndex >= graph.nodes.length - 1;
	// biome-ignore lint/style/noNonNullAssertion: arrivedIndex in bounds
	const arrived = graph.nodes[arrivedIndex]!;

	if (isLast) {
		return {
			...state,
			phase: 'finished',
			nodeIndex: arrivedIndex,
			segmentT: 0,
			dwellRemainingMs: 0,
		};
	}

	if (arrived.kind === 'combat' && (arrived.dwellMs ?? 0) > 0) {
		const dwell: RailState = {
			...state,
			phase: 'dwelling',
			nodeIndex: arrivedIndex,
			segmentT: 0,
			dwellRemainingMs: arrived.dwellMs ?? 0,
		};
		return overflowMs > 0 ? advance(dwell, overflowMs) : dwell;
	}

	const passing: RailState = {
		...state,
		phase: 'gliding',
		nodeIndex: arrivedIndex,
		segmentT: 0,
		dwellRemainingMs: 0,
	};
	return overflowMs > 0 ? advance(passing, overflowMs) : passing;
}

function resumeAfterDwell(state: RailState): RailState {
	const { graph, nodeIndex } = state;
	if (nodeIndex >= graph.nodes.length - 1) {
		return { ...state, phase: 'finished', dwellRemainingMs: 0 };
	}
	return {
		...state,
		phase: 'gliding',
		segmentT: 0,
		dwellRemainingMs: 0,
	};
}
