import { Vector3 } from '@babylonjs/core/Maths/math.vector';

/**
 * Rail node — one waypoint on a level's authored camera path.
 *
 * The rail is a directed sequence of nodes. The camera glides between
 * `glide` / `transition` nodes at a constant speed; at `combat` nodes
 * it stops for `dwellMs` and the encounter director fires its cues.
 *
 * Positions and lookAts are Babylon `Vector3` instances. The Rail
 * module treats them as immutable read-models — never mutate the
 * `position` or `lookAt` of a node after construction. Use `.clone()`
 * if you need a mutable copy.
 */

export type RailNodeKind = 'glide' | 'combat' | 'transition';

export interface RailNode {
	/** Stable id used by the encounter director to attach cues. */
	readonly id: string;
	readonly kind: RailNodeKind;
	/** World-space camera position at this node. */
	readonly position: Vector3;
	/** World-space point the camera looks at. */
	readonly lookAt: Vector3;
	/**
	 * Stop time at this node before advancing. Required for `combat`
	 * (the director consumes it); 0 by default for glide / transition.
	 */
	readonly dwellMs?: number;
}

export interface RailGraph {
	/** Ordered waypoints. Must contain at least 2 nodes. */
	readonly nodes: readonly RailNode[];
	/**
	 * Glide speed in world-units per second between adjacent nodes.
	 * Authored levels override per-segment via `segmentSpeeds`.
	 */
	readonly defaultSpeedUps: number;
	/**
	 * Optional per-segment speed override. Index `i` is the segment
	 * from `nodes[i]` → `nodes[i+1]`. `undefined` falls back to
	 * `defaultSpeedUps`.
	 */
	readonly segmentSpeeds?: readonly (number | undefined)[];
}

/** Total length of the rail polyline in world units. */
export function railLength(graph: RailGraph): number {
	let total = 0;
	for (let i = 0; i < graph.nodes.length - 1; i++) {
		// biome-ignore lint/style/noNonNullAssertion: bounded by loop
		total += Vector3.Distance(graph.nodes[i]!.position, graph.nodes[i + 1]!.position);
	}
	return total;
}

/** Speed for the segment leaving `nodes[index]`. */
export function segmentSpeed(graph: RailGraph, index: number): number {
	const override = graph.segmentSpeeds?.[index];
	return override ?? graph.defaultSpeedUps;
}
