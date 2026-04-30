/**
 * Pure melee math. The combat layer asks: is this target within the
 * melee weapon's reach AND within the player's facing arc? If yes,
 * apply damage. If no, the controller paths the player closer (PRQ-06
 * tap-travel) and re-checks on arrival.
 *
 * Inputs are world-space xz only — vertical doesn't matter for the
 * stapler swing math (player + manager are both standing on the same
 * carpet plane).
 */

export interface Vec2 {
	x: number;
	z: number;
}

export interface MeleeCheck {
	/** Did the swing connect? */
	hit: boolean;
	/** Why not? Useful for the controller to decide path-then-swing. */
	reason: 'in-range' | 'too-far' | 'wrong-facing' | 'invalid';
}

/**
 * Returns whether a melee strike connects given the player's pose and
 * the target's xz position. Spec §0 stapler: 1.5u range, 30° facing
 * arc.
 *
 * `playerForward` is the unit vector the camera (and weapon) are
 * pointing along, projected to xz. Caller is responsible for
 * normalizing if needed; we tolerate any non-zero magnitude.
 */
export function checkMelee(
	playerPosition: Vec2,
	playerForward: Vec2,
	targetPosition: Vec2,
	range: number,
	facingMaxDeg: number,
): MeleeCheck {
	const dx = targetPosition.x - playerPosition.x;
	const dz = targetPosition.z - playerPosition.z;
	const distSq = dx * dx + dz * dz;
	if (distSq > range * range) return { hit: false, reason: 'too-far' };
	const dist = Math.sqrt(distSq);
	if (dist === 0) return { hit: true, reason: 'in-range' };

	const fwdMag = Math.hypot(playerForward.x, playerForward.z);
	if (fwdMag === 0) return { hit: false, reason: 'invalid' };
	const dot = (playerForward.x * dx + playerForward.z * dz) / (fwdMag * dist);
	const cutoff = Math.cos((facingMaxDeg * Math.PI) / 180);
	if (dot < cutoff) return { hit: false, reason: 'wrong-facing' };

	return { hit: true, reason: 'in-range' };
}
