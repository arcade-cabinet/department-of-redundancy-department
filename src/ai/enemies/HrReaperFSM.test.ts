import { describe, expect, it } from 'vitest';
import {
	createReaperFSM,
	REAPER_HITSCAN_DAMAGE,
	REAPER_HP,
	REAPER_TELEPORT_COOLDOWN_S,
	REAPER_VISION_RANGE,
	tickReaper,
} from './HrReaperFSM';

const playerPos = { x: 0, y: 0, z: 0 };

describe('HrReaper FSM', () => {
	it('starts in idle with full HP', () => {
		const fsm = createReaperFSM(0, { x: 0, y: 0, z: 0 });
		expect(fsm.state).toBe('idle');
		expect(fsm.hp).toBe(REAPER_HP);
		expect(REAPER_HP).toBe(600);
	});

	it('idle → engage when player enters vision range', () => {
		let fsm = createReaperFSM(0, { x: 5, y: 0, z: 5 });
		fsm = tickReaper(fsm, { now: 0.1, playerPos: { x: 5, y: 0, z: 6 }, hasLOS: true });
		expect(fsm.state).toBe('engage');
	});

	it('vision range is 30u (always sees player on the floor)', () => {
		expect(REAPER_VISION_RANGE).toBe(30);
		let fsm = createReaperFSM(0, { x: 0, y: 0, z: 0 });
		// Player just inside vision range
		fsm = tickReaper(fsm, {
			now: 0,
			playerPos: { x: REAPER_VISION_RANGE - 0.1, y: 0, z: 0 },
			hasLOS: true,
		});
		expect(fsm.state).toBe('engage');
		// Past range - reaper drops back to idle
		fsm = createReaperFSM(0, { x: 0, y: 0, z: 0 });
		fsm = tickReaper(fsm, {
			now: 0,
			playerPos: { x: REAPER_VISION_RANGE + 1, y: 0, z: 0 },
			hasLOS: true,
		});
		expect(fsm.state).toBe('idle');
	});

	it('engage hitscan fires on the 1.5s cadence', () => {
		let fsm = createReaperFSM(0, { x: 0, y: 0, z: 0 });
		// First tick: enter engage.
		fsm = tickReaper(fsm, { now: 0.1, playerPos, hasLOS: true });
		expect(fsm.state).toBe('engage');
		// Second tick: opens fire instantly (lastFireAt starts at -Inf).
		fsm = tickReaper(fsm, { now: 0.2, playerPos, hasLOS: true });
		expect(fsm.action.kind).toBe('fire-hitscan');
		if (fsm.action.kind === 'fire-hitscan') {
			expect(fsm.action.damage).toBe(REAPER_HITSCAN_DAMAGE);
		}
		// Just under 1.5s later — no fire.
		fsm = tickReaper(fsm, { now: 1.0, playerPos, hasLOS: true });
		expect(fsm.action.kind).not.toBe('fire-hitscan');
		// At 1.7s (lastFireAt was 0.2; +1.5 = 1.7) — fire again.
		fsm = tickReaper(fsm, { now: 1.7, playerPos, hasLOS: true });
		expect(fsm.action.kind).toBe('fire-hitscan');
		expect(REAPER_HITSCAN_DAMAGE).toBe(30);
	});

	it('teleport cooldown gates the windup', () => {
		expect(REAPER_TELEPORT_COOLDOWN_S).toBe(12);
		let fsm = createReaperFSM(0, { x: 0, y: 0, z: 0 });
		fsm = tickReaper(fsm, { now: 0.1, playerPos, hasLOS: true });
		// Should not enter teleport-windup before 12s.
		fsm = tickReaper(fsm, { now: 5, playerPos, hasLOS: true });
		expect(fsm.state).toBe('engage');
		// At 12s+ - windup begins.
		fsm = tickReaper(fsm, { now: 12.1, playerPos, hasLOS: true });
		expect(fsm.state).toBe('teleport-windup');
	});

	it('teleport-windup with no candidate aborts to engage at original position (no self-snipe)', () => {
		let fsm = createReaperFSM(0, { x: 0, y: 0, z: 0 });
		fsm = tickReaper(fsm, { now: 0.1, playerPos, hasLOS: true });
		fsm = tickReaper(fsm, { now: 12.1, playerPos, hasLOS: true });
		expect(fsm.state).toBe('teleport-windup');
		// No candidateTarget supplied — runtime nav-fail. Reaper must
		// NOT land on the player.
		fsm = tickReaper(fsm, { now: 13.2, playerPos: { x: 5, y: 0, z: 5 }, hasLOS: true });
		expect(fsm.state).toBe('engage');
		expect(fsm.position).toEqual({ x: 0, y: 0, z: 0 });
		expect(fsm.action.kind).toBe('face-player');
	});

	it('teleport-windup → engage at new position after 1s', () => {
		let fsm = createReaperFSM(0, { x: 0, y: 0, z: 0 });
		fsm = tickReaper(fsm, { now: 0.1, playerPos, hasLOS: true });
		fsm = tickReaper(fsm, { now: 12.1, playerPos, hasLOS: true });
		expect(fsm.state).toBe('teleport-windup');
		fsm = tickReaper(fsm, {
			now: 13.2,
			playerPos: { x: 5, y: 0, z: 5 },
			hasLOS: true,
			candidateTarget: { x: 8, y: 0, z: 5 },
		});
		expect(fsm.state).toBe('engage');
		expect(fsm.position.x).toBe(8);
		expect(fsm.position.z).toBe(5);
	});

	it('damage-then-die transitions to death state', () => {
		let fsm = createReaperFSM(0, { x: 0, y: 0, z: 0 });
		fsm = tickReaper(fsm, { now: 0.1, playerPos, hasLOS: true });
		fsm = applyDamageToReaper(fsm, REAPER_HP);
		expect(fsm.state).toBe('death');
		expect(fsm.hp).toBe(0);
	});

	it('death state idempotent — no further state changes', () => {
		let fsm = createReaperFSM(0, { x: 0, y: 0, z: 0 });
		fsm = applyDamageToReaper(fsm, REAPER_HP);
		expect(fsm.state).toBe('death');
		fsm = tickReaper(fsm, { now: 100, playerPos, hasLOS: true });
		expect(fsm.state).toBe('death');
	});
});

// Helper imported in the test only to keep applyDamage colocated.
import { applyDamageToReaper } from './HrReaperFSM';
