/**
 * Auto-engage controller. Tap-engage on an enemy sets the player's
 * engageTarget; while the target is alive + in LOS + in range, the
 * weapon fires at its cooldown cadence. Re-tap on the same target is
 * a no-op (reaffirm); tap elsewhere cancels.
 *
 * The controller is a pure-data state machine — runtime owns the
 * Equipped + Health refs and the BVH raycaster, calls `tickAutoEngage`
 * each frame, and applies the returned actions.
 */

export interface AutoEngageState {
	/** Entity id of the locked-on enemy, or null when idle. */
	targetId: string | null;
	/** When the controller acquired this target. Drives "first-shot
	 *  immediate fire" so the player gets feedback the same frame they
	 *  tap. */
	acquiredAt: number;
}

export interface AutoEngageInput {
	state: AutoEngageState;
	now: number; // game seconds
	/** Is the locked target still alive? Caller checks Health.current > 0. */
	targetAlive: boolean;
	/** Has the target been visible (LOS clear) since the last tick? */
	targetVisible: boolean;
	/** Is the target within the equipped weapon's range? */
	targetInRange: boolean;
	/** Has the weapon's cooldown elapsed? canFire(equipped, cd, now). */
	weaponReady: boolean;
}

export interface AutoEngageAction {
	/** Fire the equipped weapon this tick. Caller does the actual
	 *  damage / projectile spawn. */
	fire: boolean;
	/** Clear engagement (target invalid). */
	clear: boolean;
}

export function freshAutoEngage(): AutoEngageState {
	return { targetId: null, acquiredAt: -Infinity };
}

export function setEngageTarget(
	state: AutoEngageState,
	targetId: string,
	now: number,
): AutoEngageState {
	if (state.targetId === targetId) return state;
	return { targetId, acquiredAt: now };
}

export function clearEngageTarget(state: AutoEngageState): AutoEngageState {
	if (state.targetId === null) return state;
	return { targetId: null, acquiredAt: -Infinity };
}

export function tickAutoEngage(input: AutoEngageInput): {
	state: AutoEngageState;
	action: AutoEngageAction;
} {
	const { state } = input;
	if (state.targetId === null) {
		return { state, action: { fire: false, clear: false } };
	}
	if (!input.targetAlive) {
		return { state: clearEngageTarget(state), action: { fire: false, clear: true } };
	}
	if (!input.targetVisible || !input.targetInRange) {
		// Hold the lock — player remains engaged but doesn't fire. Caller
		// can choose to clear it after a longer LOS-lost timeout.
		return { state, action: { fire: false, clear: false } };
	}
	if (!input.weaponReady) {
		return { state, action: { fire: false, clear: false } };
	}
	return { state, action: { fire: true, clear: false } };
}
