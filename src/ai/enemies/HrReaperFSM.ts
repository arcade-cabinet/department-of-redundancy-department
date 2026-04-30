/**
 * HR Reaper FSM (PRQ-13 T1+T2). Pure-data state machine; the R3F
 * runtime drives transforms + emits hitscan damage based on the
 * `action` field returned each tick.
 *
 * Spec §0 + plan T1: 600 HP, 360°/30u vision (effectively always
 * sees the player on a 64×64u floor), 30 dmg auditor-pen hitscan at
 * 1.5s cadence, teleport every 12s. Single, unkillable-feeling fight
 * — death triggers floor-key drop + threat reset.
 *
 * States:
 *   - idle: spawn pose; transitions to engage on player-in-range.
 *   - engage: face player, fire hitscan on cadence, eyeball teleport
 *     cooldown.
 *   - teleport-windup: 1s pause before instant translation; dispatch
 *     point-of-arrival pick to runtime via `action.kind = 'teleport'`.
 *     The runtime supplies `candidateTarget` on the resolving tick.
 *   - death: terminal; runtime drops floor-key + unlocks Up-Door.
 */

import type { Vec3World } from '@/world/floor/floorRouter';

export type ReaperState = 'idle' | 'engage' | 'teleport-windup' | 'death';

export interface ReaperFSM {
	state: ReaperState;
	hp: number;
	position: Vec3World;
	enteredAt: number;
	lastFireAt: number;
	lastTeleportAt: number;
	action: ReaperAction;
}

export type ReaperAction =
	| { kind: 'idle' }
	| { kind: 'face-player' }
	| { kind: 'fire-hitscan'; damage: number; targetPos: Vec3World }
	| { kind: 'teleport-windup' }
	| { kind: 'teleport-arrive'; target: Vec3World }
	| { kind: 'death-spawn-key' };

export interface ReaperTickInput {
	now: number; // game seconds
	playerPos: Vec3World;
	hasLOS: boolean;
	/** Runtime-supplied candidate teleport position; required for the
	 *  windup → arrive transition. Computed by `pickTeleportCell`. */
	candidateTarget?: Vec3World;
}

export const REAPER_HP = 600;
export const REAPER_VISION_RANGE = 30;
export const REAPER_HITSCAN_DAMAGE = 30;
export const REAPER_HITSCAN_CADENCE_S = 1.5;
export const REAPER_TELEPORT_COOLDOWN_S = 12;
export const REAPER_TELEPORT_WINDUP_S = 1;

export function createReaperFSM(now: number, position: Vec3World): ReaperFSM {
	return {
		state: 'idle',
		hp: REAPER_HP,
		position,
		enteredAt: now,
		// -Infinity → first engage tick fires immediately. Matches
		// MiddleManagerFSM precedent; intentional aggressive opening.
		lastFireAt: -Infinity,
		lastTeleportAt: now,
		action: { kind: 'idle' },
	};
}

export function tickReaper(fsm: ReaperFSM, input: ReaperTickInput): ReaperFSM {
	if (fsm.state === 'death') return fsm;

	const dist = distance(fsm.position, input.playerPos);
	const inRange = dist <= REAPER_VISION_RANGE;

	if (fsm.state === 'idle') {
		if (inRange && input.hasLOS) {
			return enterState(fsm, 'engage', input.now, { kind: 'face-player' });
		}
		return { ...fsm, action: { kind: 'idle' } };
	}

	if (fsm.state === 'engage') {
		// Teleport cooldown elapsed → enter windup.
		if (input.now - fsm.lastTeleportAt >= REAPER_TELEPORT_COOLDOWN_S) {
			return enterState(fsm, 'teleport-windup', input.now, { kind: 'teleport-windup' });
		}
		// Hitscan cadence.
		if (input.now - fsm.lastFireAt >= REAPER_HITSCAN_CADENCE_S) {
			return {
				...fsm,
				lastFireAt: input.now,
				action: {
					kind: 'fire-hitscan',
					damage: REAPER_HITSCAN_DAMAGE,
					targetPos: { ...input.playerPos },
				},
			};
		}
		return { ...fsm, action: { kind: 'face-player' } };
	}

	if (fsm.state === 'teleport-windup') {
		if (input.now - fsm.enteredAt >= REAPER_TELEPORT_WINDUP_S) {
			// If the runtime can't find a valid teleport cell (tight floor,
			// no walkable band ∈ [2,8]u from player), abort the teleport
			// rather than landing on the player. Reset cooldown so the
			// reaper retries in 12s.
			if (!input.candidateTarget) {
				return {
					...fsm,
					state: 'engage',
					enteredAt: input.now,
					lastTeleportAt: input.now,
					action: { kind: 'face-player' },
				};
			}
			const target = input.candidateTarget;
			return {
				...fsm,
				state: 'engage',
				position: { ...target },
				enteredAt: input.now,
				lastTeleportAt: input.now,
				action: { kind: 'teleport-arrive', target: { ...target } },
			};
		}
		return { ...fsm, action: { kind: 'teleport-windup' } };
	}

	return fsm;
}

export function applyDamageToReaper(fsm: ReaperFSM, dmg: number): ReaperFSM {
	if (fsm.state === 'death') return fsm;
	const hp = Math.max(0, fsm.hp - dmg);
	if (hp <= 0) {
		return {
			...fsm,
			hp: 0,
			state: 'death',
			enteredAt: fsm.enteredAt,
			action: { kind: 'death-spawn-key' },
		};
	}
	return { ...fsm, hp };
}

function enterState(
	fsm: ReaperFSM,
	state: ReaperState,
	now: number,
	action: ReaperAction,
): ReaperFSM {
	return { ...fsm, state, enteredAt: now, action };
}

function distance(a: Vec3World, b: Vec3World): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
