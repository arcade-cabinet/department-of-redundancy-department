import type { Vector3 } from 'yuka';
import { type MemoryRecord, shouldInvestigate } from '@/ai/perception/Vision';
import { createRng, type Rng } from '@/world/generator/rng';

/**
 * Middle-manager FSM. Pure-data state machine: callers feed perception
 * + game-clock, the FSM returns the next state + the action to take
 * this tick (set-path, fire-hitscan, idle, etc.). The R3F runtime
 * (T1+ wiring) consumes those actions to drive the yuka.Vehicle and
 * fire hitscans.
 *
 * States (spec §7 manager row + plan T4):
 *   - Idle: stand at spawn / desk; randomly transition to Patrol after
 *     2-4s.
 *   - Patrol: pick a random walkable target within 8u; FollowPath; on
 *     arrival, back to Idle.
 *   - Investigate: triggered when MemoryRecord shows player seen <3s
 *     ago AND not currently visible. FollowPath to lastSeenPosition.
 *     On arrival OR after 5s timeout: back to Patrol. Player visible
 *     → Engage.
 *   - Engage: face player; fire hitscan at 1Hz (1000ms cooldown);
 *     reposition every 4s. LOS lost > 3s → Investigate.
 *   - Reposition: pick a cell 3-6u from current position still within
 *     engagement range; FollowPath; back to Engage on arrival.
 *   - Death: drop pickup; set Character state="death"; despawn after
 *     1.5s.
 *
 * Transition triggers come from `tick()` events: perception updates
 * memory + visibility; arrival is signaled when the FollowPath gets
 * close to its goal; the rest is timed.
 */

export type FSMStateName = 'idle' | 'patrol' | 'investigate' | 'engage' | 'reposition' | 'death';

export interface FSMState {
	name: FSMStateName;
	enteredAt: number; // game seconds when entered
	/** Current target position for the navmesh (if any). The runtime
	 *  re-runs `vehicle.pathTo(navMesh, target)` whenever this changes. */
	target: Vector3 | null;
	/** When the last hitscan was fired (in Engage). Game seconds. */
	lastFireAt: number;
}

export interface PerceptionInput {
	/** Current visibility from perception (Vision.canSee + LOS). */
	visible: boolean;
	/** Current player position (used to set Engage target / Investigate goal). */
	playerPosition: Vector3;
	/** Current self position (for distance-based decisions). */
	selfPosition: Vector3;
	memory: MemoryRecord;
	/** Game clock in seconds. */
	now: number;
	/** Has the FollowPath arrived at the current target? */
	arrived: boolean;
	/** Picks a walkable cell near the manager for Patrol/Reposition.
	 *  Returns null if no candidate is reachable. */
	pickPatrolTarget: (selfPosition: Vector3, rng: Rng) => Vector3 | null;
	pickRepositionTarget: (selfPosition: Vector3, rng: Rng) => Vector3 | null;
}

export interface FSMAction {
	/** Set the vehicle's path to this target via the navmesh. null = clear. */
	setTarget: Vector3 | null;
	/** Fire a hitscan at the player this tick. */
	fireHitscan: boolean;
	/** Face the player (override forward independent of velocity). */
	facePlayer: boolean;
	/** True once after death animation completes. */
	despawn: boolean;
}

export const PATROL_MIN_IDLE_S = 2;
export const PATROL_MAX_IDLE_S = 4;
export const ENGAGE_FIRE_COOLDOWN_S = 1.0;
export const ENGAGE_REPOSITION_INTERVAL_S = 4;
export const INVESTIGATE_TIMEOUT_S = 5;
export const ENGAGE_LOS_LOST_TIMEOUT_S = 3;
export const DEATH_DESPAWN_S = 1.5;

export function freshFSM(now: number): FSMState {
	return { name: 'idle', enteredAt: now, target: null, lastFireAt: -Infinity };
}

export function tick(
	state: FSMState,
	perception: PerceptionInput,
	rngFactory: (seed: string) => Rng,
): { state: FSMState; action: FSMAction } {
	const noAction: FSMAction = {
		setTarget: null,
		fireHitscan: false,
		facePlayer: false,
		despawn: false,
	};

	switch (state.name) {
		case 'idle':
			// Engage immediately on visible player.
			if (perception.visible) {
				return enter('engage', state, perception);
			}
			// Investigate if we recently saw the player.
			if (shouldInvestigate(perception.memory, perception.now)) {
				return enter('investigate', state, perception);
			}
			// Patrol after a 2-4s idle (deterministic from `enteredAt`).
			if (perception.now - state.enteredAt >= idleDuration(state.enteredAt, rngFactory)) {
				return enter('patrol', state, perception);
			}
			return { state, action: noAction };

		case 'patrol':
			if (perception.visible) return enter('engage', state, perception);
			if (shouldInvestigate(perception.memory, perception.now)) {
				return enter('investigate', state, perception);
			}
			if (perception.arrived || state.target === null) {
				return enter('idle', state, perception);
			}
			return { state, action: { ...noAction, setTarget: state.target } };

		case 'investigate':
			if (perception.visible) return enter('engage', state, perception);
			if (perception.arrived) return enter('patrol', state, perception);
			if (perception.now - state.enteredAt >= INVESTIGATE_TIMEOUT_S) {
				return enter('patrol', state, perception);
			}
			// Drive toward last-seen.
			return {
				state,
				action: {
					...noAction,
					setTarget: perception.memory.lastSeenPosition ?? state.target,
				},
			};

		case 'engage': {
			if (!perception.visible) {
				if (perception.now - state.lastFireAt >= ENGAGE_LOS_LOST_TIMEOUT_S) {
					return enter('investigate', state, perception);
				}
				// Brief LOS dropout — keep facing player but don't fire.
				return { state, action: { ...noAction, facePlayer: true } };
			}
			if (perception.now - state.enteredAt >= ENGAGE_REPOSITION_INTERVAL_S) {
				return enter('reposition', state, perception);
			}
			const fire = perception.now - state.lastFireAt >= ENGAGE_FIRE_COOLDOWN_S;
			const next: FSMState = fire ? { ...state, lastFireAt: perception.now } : state;
			return {
				state: next,
				action: {
					...noAction,
					facePlayer: true,
					fireHitscan: fire,
				},
			};
		}

		case 'reposition':
			if (perception.arrived || state.target === null) {
				return enter('engage', state, perception);
			}
			if (!perception.visible) {
				if (perception.now - state.enteredAt >= 2) {
					// Lost LOS during reposition for 2s → fall back to investigate.
					return enter('investigate', state, perception);
				}
			}
			return { state, action: { ...noAction, setTarget: state.target } };

		case 'death':
			if (perception.now - state.enteredAt >= DEATH_DESPAWN_S) {
				return { state, action: { ...noAction, despawn: true } };
			}
			return { state, action: noAction };
	}
}

/** Force-transition to death, bypassing all gate checks. The combat
 *  layer calls this when HP hits 0. */
export function killFSM(state: FSMState, now: number): FSMState {
	return { ...state, name: 'death', enteredAt: now, target: null };
}

function enter(
	to: FSMStateName,
	prev: FSMState,
	perception: PerceptionInput,
): { state: FSMState; action: FSMAction } {
	const next: FSMState = {
		name: to,
		enteredAt: perception.now,
		target: prev.target,
		lastFireAt: prev.lastFireAt,
	};
	const noAction: FSMAction = {
		setTarget: null,
		fireHitscan: false,
		facePlayer: false,
		despawn: false,
	};
	switch (to) {
		case 'patrol': {
			const rng = createRng(`patrol::${perception.now}`);
			const target = perception.pickPatrolTarget(perception.selfPosition, rng);
			next.target = target;
			return { state: next, action: { ...noAction, setTarget: target } };
		}
		case 'investigate':
			next.target = perception.memory.lastSeenPosition ?? null;
			return { state: next, action: { ...noAction, setTarget: next.target } };
		case 'engage':
			next.target = null;
			next.lastFireAt = -Infinity; // first shot fires immediately
			return {
				state: next,
				action: { ...noAction, facePlayer: true },
			};
		case 'reposition': {
			const rng = createRng(`reposition::${perception.now}`);
			next.target = perception.pickRepositionTarget(perception.selfPosition, rng);
			return { state: next, action: { ...noAction, setTarget: next.target } };
		}
		case 'idle':
			next.target = null;
			return { state: next, action: noAction };
		case 'death':
			next.target = null;
			return { state: next, action: noAction };
	}
}

/** Random-but-deterministic idle duration in [PATROL_MIN_IDLE_S, PATROL_MAX_IDLE_S]
 *  derived from the enteredAt timestamp. Gives the manager varied
 *  patrol cadence without holding a stateful RNG. */
function idleDuration(enteredAt: number, rngFactory: (seed: string) => Rng): number {
	const r = rngFactory(`idle-dur::${enteredAt}`);
	return PATROL_MIN_IDLE_S + r.next() * (PATROL_MAX_IDLE_S - PATROL_MIN_IDLE_S);
}
