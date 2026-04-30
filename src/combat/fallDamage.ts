/**
 * Fall damage. Spec §4 vertical traversal:
 *   damage = clamp((dropHeight - 3) * 8, 0, 100)
 *
 * 0..3u falls are free (one-cubicle drop is forgiving). Beyond 3u
 * each additional cube of drop is +8 HP. Caps at 100 to keep
 * one-shot deaths bounded by player max HP.
 *
 * The runtime tracks fall start (kinematic body grounded → airborne)
 * and resolves at landing (airborne → grounded). dropHeight is the
 * Y-axis delta in world units.
 */

export const FREE_FALL_HEIGHT = 3; // world units
export const DAMAGE_PER_UNIT = 8;
export const MAX_FALL_DAMAGE = 100;

export function fallDamageFor(dropHeight: number): number {
	if (dropHeight <= FREE_FALL_HEIGHT) return 0;
	const raw = (dropHeight - FREE_FALL_HEIGHT) * DAMAGE_PER_UNIT;
	return Math.min(MAX_FALL_DAMAGE, Math.round(raw));
}

/** Kinematic helper: caller tracks grounded state per-frame. Pass the
 *  previous + current grounded flag + the player's current Y to update
 *  the fall record; returns damage to apply when landing this frame. */
export interface FallRecord {
	startY: number | null; // null = currently grounded or never airborne
}

export function freshFallRecord(): FallRecord {
	return { startY: null };
}

export function tickFall(
	record: FallRecord,
	wasGrounded: boolean,
	isGrounded: boolean,
	currentY: number,
): { record: FallRecord; damage: number } {
	if (wasGrounded && !isGrounded) {
		// Took off — start tracking.
		return { record: { startY: currentY }, damage: 0 };
	}
	if (!wasGrounded && isGrounded && record.startY !== null) {
		// Landed — resolve damage.
		const drop = record.startY - currentY;
		const damage = fallDamageFor(drop);
		return { record: { startY: null }, damage };
	}
	return { record, damage: 0 };
}
