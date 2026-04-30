/**
 * Single-step climb math. Spec §11 T7: tap "Climb On" on a desk to
 * teleport the player up by `desk.height`, capped at 1.2u so the
 * player can't climb a wall in one tap.
 *
 * The runtime calls `tryClimbStep(playerY, targetTopY)` and applies
 * the returned delta to the kinematic body's translation.
 */

export const MAX_CLIMB_STEP = 1.2; // world units

export interface ClimbResult {
	allowed: boolean;
	deltaY: number; // 0 if rejected
	reason?: 'too-high' | 'descending';
}

export function tryClimbStep(playerY: number, targetTopY: number): ClimbResult {
	const dy = targetTopY - playerY;
	if (dy <= 0) return { allowed: false, deltaY: 0, reason: 'descending' };
	if (dy > MAX_CLIMB_STEP) return { allowed: false, deltaY: 0, reason: 'too-high' };
	return { allowed: true, deltaY: dy };
}
