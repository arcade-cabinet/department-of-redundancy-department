import { Vector3 } from 'yuka';
import type { Rng } from '@/world/generator/rng';

/**
 * Hitscan ray spec — the math layer. Produces a (origin, direction)
 * ray after applying accuracy spread; the caller does the actual
 * three-mesh-bvh raycast against world chunks + dynamic actors.
 *
 * Why split this out: keeps the math testable in node (no three / no
 * BVH); the runtime uses `applyHitscanSpread()` to derive the ray,
 * then the existing chunk BVH machinery to find the first hit.
 *
 * Accuracy semantics (spec §7 manager row): `accuracy` is in [0, 1].
 *   1.0 → no spread (exact aim).
 *   0.6 → ±5° random cone (manager default).
 *   0.0 → ±~14° wide cone.
 * Spread cone half-angle = (1 - accuracy) * MAX_SPREAD_RAD.
 */

export const MAX_SPREAD_DEG = 14;
export const MAX_SPREAD_RAD = (MAX_SPREAD_DEG * Math.PI) / 180;

export interface HitscanInput {
	origin: Vector3;
	/** Pre-normalized aim direction. */
	direction: Vector3;
	accuracy: number; // [0, 1]
	rng: Rng;
}

export interface HitscanRay {
	origin: Vector3;
	direction: Vector3;
}

/**
 * Apply RNG-driven angular spread to the aim direction. The spread is
 * sampled uniformly in a polar disc around the aim, then the two
 * tangent-axis components are added to the direction and re-normalized.
 *
 * Returns a fresh `HitscanRay` so the caller can hand it to the BVH
 * raycaster without mutating the original aim vector.
 */
export function applyHitscanSpread(input: HitscanInput): HitscanRay {
	const { origin, direction, accuracy, rng } = input;
	const clampedAccuracy = Math.max(0, Math.min(1, accuracy));
	const halfAngle = (1 - clampedAccuracy) * MAX_SPREAD_RAD;

	if (halfAngle === 0) {
		return {
			origin: new Vector3(origin.x, origin.y, origin.z),
			direction: new Vector3(direction.x, direction.y, direction.z).normalize(),
		};
	}

	// Polar sample in the cone: angle from axis ∈ [0, halfAngle], azimuth ∈ [0, 2π).
	const theta = rng.next() * halfAngle;
	const phi = rng.next() * 2 * Math.PI;
	// Tangent basis from the aim direction. Pick a stable up vector that
	// isn't colinear; for our floor-level shooting Y is fine unless we're
	// firing straight up/down.
	const aim = new Vector3(direction.x, direction.y, direction.z).normalize();
	const upGuess = Math.abs(aim.y) > 0.99 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
	const tangent1 = new Vector3().crossVectors(aim, upGuess).normalize();
	const tangent2 = new Vector3().crossVectors(aim, tangent1).normalize();
	// Offset = sin(theta) * (cos(phi) * t1 + sin(phi) * t2).
	const sinT = Math.sin(theta);
	const cosT = Math.cos(theta);
	const offX = sinT * (Math.cos(phi) * tangent1.x + Math.sin(phi) * tangent2.x);
	const offY = sinT * (Math.cos(phi) * tangent1.y + Math.sin(phi) * tangent2.y);
	const offZ = sinT * (Math.cos(phi) * tangent1.z + Math.sin(phi) * tangent2.z);
	const result = new Vector3(
		aim.x * cosT + offX,
		aim.y * cosT + offY,
		aim.z * cosT + offZ,
	).normalize();

	return {
		origin: new Vector3(origin.x, origin.y, origin.z),
		direction: result,
	};
}

/** Damage application result for FSM consumption. */
export interface HitscanResult {
	/** True if the ray intersected its target (player). */
	hitTarget: boolean;
	/** Distance along the ray to the impact point (or wall, if missed). */
	distance: number;
	/** Damage dealt if hitTarget. */
	damage: number;
}
