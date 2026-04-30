import { Vector3 } from 'yuka';

/**
 * Cone-of-sight perception primitive. The host (an enemy FSM) calls
 * `cone.canSee(self, target, hasLOS)` per perception tick to decide
 * whether the target is currently visible. Two checks:
 *   1. Distance ≤ range.
 *   2. Angle from `self.forward` to (target - self.position) ≤ fov / 2.
 *   3. Caller-supplied `hasLOS` (raycast result) is true.
 *
 * The LOS check is delegated because the actual raycast needs
 * three-mesh-bvh against the chunk meshes — that lives in the
 * browser-tier `los.ts` and is too expensive to run per-tick on every
 * enemy. The FSM throttles LOS calls (5Hz cadence) and feeds the
 * result here.
 *
 * Memory record: a separate concern. `MemoryRecord` tracks
 * `lastSeenAt` so the FSM can transition `Engage → Investigate` when
 * LOS is lost but the player was seen recently.
 */

export interface VisionConfig {
	/** Field-of-view in radians. Manager: 90° = π/2. */
	fov: number;
	/** Max range in world units. Manager: 12u. */
	range: number;
}

export class VisionCone {
	readonly fov: number;
	readonly range: number;

	constructor(cfg: VisionConfig) {
		this.fov = cfg.fov;
		this.range = cfg.range;
	}

	/** Pure perception check. `forward` is `self.forward` already
	 *  unit-length per yuka.Vehicle. */
	canSee(
		selfPosition: Vector3,
		selfForward: Vector3,
		targetPosition: Vector3,
		hasLineOfSight: boolean,
	): boolean {
		if (!hasLineOfSight) return false;
		const dx = targetPosition.x - selfPosition.x;
		const dy = targetPosition.y - selfPosition.y;
		const dz = targetPosition.z - selfPosition.z;
		const distSq = dx * dx + dy * dy + dz * dz;
		if (distSq > this.range * this.range) return false;
		const dist = Math.sqrt(distSq);
		if (dist === 0) return true; // colocated: trivially visible
		// Dot product against forward unit vector. fov is the FULL angle,
		// so the half-angle threshold is fov/2; cos(fov/2) is the cutoff.
		const dot = (selfForward.x * dx + selfForward.y * dy + selfForward.z * dz) / dist;
		const cutoff = Math.cos(this.fov / 2);
		return dot >= cutoff;
	}
}

/** Per-target memory: when the target was last *positively* sensed.
 *  Updated every time `canSee()` returns true. The FSM reads this to
 *  know whether to investigate (lost LOS but recently seen) vs. patrol
 *  (never seen / forgotten). */
export interface MemoryRecord {
	lastSeenAt: number; // seconds (game clock)
	lastSeenPosition: Vector3 | null;
}

export function freshMemory(): MemoryRecord {
	return { lastSeenAt: Number.NEGATIVE_INFINITY, lastSeenPosition: null };
}

export function updateMemory(
	memory: MemoryRecord,
	visible: boolean,
	now: number,
	targetPosition: Vector3,
): MemoryRecord {
	if (!visible) return memory;
	return {
		lastSeenAt: now,
		lastSeenPosition: new Vector3(targetPosition.x, targetPosition.y, targetPosition.z),
	};
}

export function shouldInvestigate(memory: MemoryRecord, now: number, withinSeconds = 3): boolean {
	if (memory.lastSeenAt === Number.NEGATIVE_INFINITY) return false;
	return now - memory.lastSeenAt <= withinSeconds;
}
