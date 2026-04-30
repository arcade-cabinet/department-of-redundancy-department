import { Vector3 } from '@babylonjs/core/Maths/math.vector';

/**
 * SpawnRail — short authored path that an enemy or civilian prop slides along.
 * Distinct from the camera Rail (which has dwells and finished states).
 *
 * A SpawnRail is a finite waypoint sequence. Props ride it at constant speed
 * (`m/s`). On reaching the last waypoint, the prop stops and continues
 * ticking its fire program in place. Looping rails wrap to waypoint[0].
 */

export interface SpawnRailGraph {
	readonly id: string;
	readonly path: readonly Vector3[];
	readonly speed: number;
	readonly loop: boolean;
}

export interface SpawnRailState {
	readonly graph: SpawnRailGraph;
	readonly waypointIndex: number;
	readonly segmentT: number; // [0, 1] interpolating waypoint[i] → waypoint[i+1]
	readonly atEnd: boolean;
}

export function createSpawnRailState(graph: SpawnRailGraph): SpawnRailState {
	if (graph.path.length < 1) {
		throw new Error(`SpawnRail '${graph.id}' has empty path`);
	}
	return {
		graph,
		waypointIndex: 0,
		segmentT: 0,
		atEnd: graph.path.length === 1,
	};
}

export function spawnRailPosition(state: SpawnRailState): Vector3 {
	const { graph, waypointIndex, segmentT } = state;
	const path = graph.path;
	const last = path.length - 1;

	if (state.atEnd || waypointIndex >= last) {
		// biome-ignore lint/style/noNonNullAssertion: path.length >= 1 by construction
		return path[last]!.clone();
	}

	// biome-ignore lint/style/noNonNullAssertion: index in [0, last)
	const from = path[waypointIndex]!;
	// biome-ignore lint/style/noNonNullAssertion: index+1 in (0, last]
	const to = path[waypointIndex + 1]!;
	return Vector3.Lerp(from, to, segmentT);
}

export function advanceSpawnRail(state: SpawnRailState, dtMs: number): SpawnRailState {
	if (state.atEnd || dtMs <= 0) return state;

	const { graph, waypointIndex, segmentT } = state;
	const path = graph.path;
	const last = path.length - 1;

	if (waypointIndex >= last) {
		return { ...state, atEnd: true };
	}

	// biome-ignore lint/style/noNonNullAssertion: index in [0, last)
	const from = path[waypointIndex]!;
	// biome-ignore lint/style/noNonNullAssertion: index+1 in (0, last]
	const to = path[waypointIndex + 1]!;
	const segLen = Vector3.Distance(from, to);

	if (segLen === 0 || graph.speed <= 0) {
		// Degenerate: jump to next waypoint.
		const nextIdx = waypointIndex + 1;
		if (nextIdx >= last) {
			if (graph.loop) {
				return { ...state, waypointIndex: 0, segmentT: 0, atEnd: false };
			}
			return { ...state, waypointIndex: nextIdx, segmentT: 0, atEnd: true };
		}
		return advanceSpawnRail({ ...state, waypointIndex: nextIdx, segmentT: 0 }, dtMs);
	}

	const dtSec = dtMs / 1000;
	const segDurationSec = segLen / graph.speed;
	const tDelta = dtSec / segDurationSec;
	const newT = segmentT + tDelta;

	if (newT < 1) {
		return { ...state, segmentT: newT };
	}

	const overflowSec = (newT - 1) * segDurationSec;
	const overflowMs = overflowSec * 1000;
	const nextIdx = waypointIndex + 1;

	if (nextIdx >= last) {
		if (graph.loop) {
			return advanceSpawnRail(
				{ ...state, waypointIndex: 0, segmentT: 0, atEnd: false },
				overflowMs,
			);
		}
		return { ...state, waypointIndex: nextIdx, segmentT: 0, atEnd: true };
	}

	return advanceSpawnRail({ ...state, waypointIndex: nextIdx, segmentT: 0 }, overflowMs);
}
