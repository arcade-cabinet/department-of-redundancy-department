/**
 * Boss-gate predicates (PRQ-13 T4). Pure functions: caller passes the
 * floor number and live boss state, gets back whether the Up-Door
 * should be locked + whether the floor needs a Reaper spawn.
 *
 * Spec §4 + plan T4: every 5th floor (5, 10, 15, ...) is an HR Reaper
 * encounter; the Up-Door is locked until the Reaper dies. Non-boss
 * floors run the normal spawn director.
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
