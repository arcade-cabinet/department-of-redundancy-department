/**
 * Boss-gate predicates (PRQ-13 T4). Pure functions: caller passes the
 * floor number and live boss state, gets back whether the Up-Door
 * should be locked + whether the floor needs a Reaper spawn.
 *
 * Spec §4 + plan T4: every 5th floor (5, 10, 15, ...) is an HR Reaper
 * encounter; the Up-Door is locked until the Reaper dies. Non-boss
 * floors run the normal spawn director.
 *
 * **Atomicity contract (M1c2 reviewer fold):** the runtime that consumes
 * `shouldLockUpDoor` MUST flip `bossAlive=false` and emit the floor-key
 * spawn within a SINGLE tick / state update. If the FSM transitions to
 * `death` and `bossAlive` only flips on a downstream koota event, the
 * gate may briefly read `locked=true` while the key is already
 * spawning — visually the door stays barred while the player walks
 * through the key. The host (Game.tsx in M1c3) reads the FSM's `state`
 * directly via the HrReaperHandle's onDeath callback to keep both
 * sides on the same tick.
 */

export const REAPER_FLOOR_INTERVAL = 5;

export function isBossFloor(floor: number): boolean {
	return floor > 0 && floor % REAPER_FLOOR_INTERVAL === 0;
}

export interface BossGateInput {
	floor: number;
	bossAlive: boolean;
}

export function shouldLockUpDoor(input: BossGateInput): boolean {
	return isBossFloor(input.floor) && input.bossAlive;
}
