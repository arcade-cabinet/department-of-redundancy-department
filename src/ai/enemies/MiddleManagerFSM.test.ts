import { describe, expect, it } from 'vitest';
import { Vector3 } from 'yuka';
import { freshMemory, updateMemory } from '@/ai/perception/Vision';
import { createRng } from '@/world/generator/rng';
import {
	DEATH_DESPAWN_S,
	ENGAGE_FIRE_COOLDOWN_S,
	ENGAGE_REPOSITION_INTERVAL_S,
	freshFSM,
	INVESTIGATE_TIMEOUT_S,
	killFSM,
	type PerceptionInput,
	tick,
} from './MiddleManagerFSM';

const ORIGIN = new Vector3(0, 0, 0);
const PLAYER = new Vector3(5, 0, 0);

const stubPick = (target: Vector3 | null) => (_self: Vector3) => target;

function basePerception(overrides: Partial<PerceptionInput> = {}): PerceptionInput {
	return {
		visible: false,
		playerPosition: PLAYER,
		selfPosition: ORIGIN,
		memory: freshMemory(),
		now: 0,
		arrived: false,
		pickPatrolTarget: stubPick(new Vector3(8, 0, 0)),
		pickRepositionTarget: stubPick(new Vector3(3, 0, 3)),
		...overrides,
	};
}

describe('MiddleManager FSM', () => {
	it('Idle → Patrol after the random idle window', () => {
		const s = freshFSM(0);
		// Just before the 2s minimum: still idle.
		const r1 = tick(s, basePerception({ now: 1.5 }), createRng);
		expect(r1.state.name).toBe('idle');
		// After 4s (max), guaranteed transition.
		const r2 = tick(s, basePerception({ now: 4.5 }), createRng);
		expect(r2.state.name).toBe('patrol');
		expect(r2.action.setTarget).not.toBeNull();
	});

	it('Idle → Engage on visible player', () => {
		const s = freshFSM(0);
		const r = tick(s, basePerception({ visible: true, now: 0.5 }), createRng);
		expect(r.state.name).toBe('engage');
		expect(r.action.facePlayer).toBe(true);
	});

	it('Patrol → Idle on arrival', () => {
		const s = freshFSM(0);
		const r1 = tick(s, basePerception({ now: 4.5 }), createRng);
		expect(r1.state.name).toBe('patrol');
		const r2 = tick(r1.state, basePerception({ now: 6, arrived: true }), createRng);
		expect(r2.state.name).toBe('idle');
	});

	it('Patrol → Engage on player sighted mid-walk', () => {
		const s = freshFSM(0);
		const r1 = tick(s, basePerception({ now: 4.5 }), createRng);
		expect(r1.state.name).toBe('patrol');
		const r2 = tick(r1.state, basePerception({ now: 5, visible: true }), createRng);
		expect(r2.state.name).toBe('engage');
	});

	it('Engage fires at 1Hz cadence', () => {
		const s = freshFSM(0);
		const r1 = tick(s, basePerception({ visible: true, now: 0 }), createRng);
		// Tick into engage; first shot is queued.
		const r2 = tick(r1.state, basePerception({ visible: true, now: 0.001 }), createRng);
		expect(r2.action.fireHitscan).toBe(true);
		// Within cooldown: no shot.
		const r3 = tick(r2.state, basePerception({ visible: true, now: 0.5 }), createRng);
		expect(r3.action.fireHitscan).toBe(false);
		// After cooldown: shot.
		const r4 = tick(r2.state, basePerception({ visible: true, now: 1.1 }), createRng);
		expect(r4.action.fireHitscan).toBe(true);
	});

	it('Engage → Reposition every 4s', () => {
		const s = freshFSM(0);
		const r = tick(s, basePerception({ visible: true, now: 0 }), createRng);
		const r2 = tick(
			r.state,
			basePerception({ visible: true, now: ENGAGE_REPOSITION_INTERVAL_S + 0.1 }),
			createRng,
		);
		expect(r2.state.name).toBe('reposition');
		expect(r2.action.setTarget).not.toBeNull();
	});

	it('Engage → Investigate after sustained LOS loss', () => {
		const s = freshFSM(0);
		const r = tick(s, basePerception({ visible: true, now: 0 }), createRng);
		// Fire once.
		const r2 = tick(r.state, basePerception({ visible: true, now: 0.001 }), createRng);
		expect(r2.action.fireHitscan).toBe(true);
		// Lose LOS for >3s.
		const memWithSeen = updateMemory(freshMemory(), true, 0.001, PLAYER);
		const r3 = tick(
			r2.state,
			basePerception({ visible: false, now: 5, memory: memWithSeen }),
			createRng,
		);
		expect(r3.state.name).toBe('investigate');
	});

	it('Reposition → Engage on arrival', () => {
		const s = freshFSM(0);
		const r = tick(s, basePerception({ visible: true, now: 0 }), createRng);
		const repos = tick(
			r.state,
			basePerception({ visible: true, now: ENGAGE_REPOSITION_INTERVAL_S + 0.1 }),
			createRng,
		);
		expect(repos.state.name).toBe('reposition');
		const back = tick(
			repos.state,
			basePerception({ visible: true, now: 6, arrived: true }),
			createRng,
		);
		expect(back.state.name).toBe('engage');
	});

	it('Investigate → Patrol on timeout', () => {
		const s = freshFSM(0);
		// Force into investigate via Idle path.
		const memWithSeen = updateMemory(freshMemory(), true, 0, PLAYER);
		const r = tick(s, basePerception({ visible: false, now: 0.5, memory: memWithSeen }), createRng);
		expect(r.state.name).toBe('investigate');
		const t = tick(
			r.state,
			basePerception({
				visible: false,
				now: 0.5 + INVESTIGATE_TIMEOUT_S + 0.1,
				memory: memWithSeen,
			}),
			createRng,
		);
		expect(t.state.name).toBe('patrol');
	});

	it('killFSM transitions to death; death despawns after 1.5s', () => {
		const s = freshFSM(10);
		const dead = killFSM(s, 10);
		expect(dead.name).toBe('death');
		const r1 = tick(dead, basePerception({ now: 11 }), createRng);
		expect(r1.action.despawn).toBe(false);
		const r2 = tick(dead, basePerception({ now: 10 + DEATH_DESPAWN_S + 0.1 }), createRng);
		expect(r2.action.despawn).toBe(true);
	});

	it('FSM hot-start with visible player goes Idle → Engage same tick', () => {
		const s = freshFSM(0);
		const r = tick(s, basePerception({ visible: true, now: 0.001 }), createRng);
		expect(r.state.name).toBe('engage');
	});

	it('Engage fire cooldown is 1.0s', () => {
		expect(ENGAGE_FIRE_COOLDOWN_S).toBe(1.0);
	});
});
