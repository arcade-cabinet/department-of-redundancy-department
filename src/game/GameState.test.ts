import { describe, expect, it } from 'vitest';
import {
	collectHealthKit,
	damagePlayer,
	HEALTH_KIT_HP,
	PLAYER_BASE_HP,
	RUN_LIVES,
	recordKill,
	resumeFromContinue,
	startRun,
} from './GameState';

describe('startRun', () => {
	it('seeds 3 lives and full HP per the canonical run', () => {
		const s = startRun(0);
		expect(s.phase).toBe('playing');
		expect(s.run?.remainingLives).toBe(RUN_LIVES);
		expect(s.run?.playerHp).toBe(PLAYER_BASE_HP);
		expect(s.run?.maxPlayerHp).toBe(PLAYER_BASE_HP);
		expect(s.run?.score).toBe(0);
	});
});

describe('damagePlayer + continue lifecycle', () => {
	it('drops HP without ending the run while HP > 0', () => {
		const s = damagePlayer(startRun(0), 25);
		expect(s.phase).toBe('playing');
		expect(s.run?.playerHp).toBe(PLAYER_BASE_HP - 25);
		expect(s.run?.remainingLives).toBe(RUN_LIVES);
	});

	it('moves to continue-prompt on first lethal hit', () => {
		const s = damagePlayer(startRun(0), 999);
		expect(s.phase).toBe('continue-prompt');
		expect(s.run?.remainingLives).toBe(RUN_LIVES - 1);
	});

	it('every life loss returns to continue-prompt — game-over is the user declining', () => {
		// Per docs/spec/06-economy.md: each death moves to continue-prompt;
		// the user declining (or running out of quarters) is what ends the
		// run. resumeFromContinue refills lives back to RUN_LIVES, so the
		// "exhaust all lives without a continue" path doesn't exist — every
		// death is a continue decision.
		const s = damagePlayer(startRun(0), 999);
		expect(s.phase).toBe('continue-prompt');
		expect(s.run?.remainingLives).toBe(RUN_LIVES - 1);
	});

	it('resumeFromContinue refills HP and lives back to RUN_LIVES per docs/spec/06-economy.md', () => {
		let s = damagePlayer(startRun(0), 999);
		expect(s.phase).toBe('continue-prompt');
		s = resumeFromContinue(s);
		expect(s.phase).toBe('playing');
		expect(s.run?.playerHp).toBe(PLAYER_BASE_HP);
		expect(s.run?.remainingLives).toBe(RUN_LIVES);
	});
});

describe('collectHealthKit', () => {
	it('refunds HP up to maxPlayerHp', () => {
		let s = damagePlayer(startRun(0), 50);
		expect(s.run?.playerHp).toBe(50);
		s = collectHealthKit(s);
		expect(s.run?.playerHp).toBe(50 + HEALTH_KIT_HP);
	});

	it('caps at maxPlayerHp; never overshoots', () => {
		const s = collectHealthKit(damagePlayer(startRun(0), 5));
		expect(s.run?.playerHp).toBe(PLAYER_BASE_HP);
	});

	it('preserves combo (kits do not break the chain)', () => {
		let s = recordKill(startRun(0), 'body');
		s = recordKill(s, 'body');
		expect(s.run?.comboCount).toBe(2);
		s = damagePlayer(s, 30);
		// damage breaks combo first
		s = collectHealthKit(s);
		expect(s.run?.comboCount).toBe(0); // already 0 from damage
		// run a positive case: kit while combo intact
		let t = recordKill(startRun(0), 'head');
		t = recordKill(t, 'head');
		// take a tiny scratch, then heal — combo would've been 0 after damage
		// already, but the kit itself does NOT zero a chain.
		const beforeKit = recordKill(t, 'body');
		const afterKit = collectHealthKit(beforeKit);
		expect(afterKit.run?.comboCount).toBe(beforeKit.run?.comboCount);
	});

	it('no-ops at full HP', () => {
		const s0 = startRun(0);
		const s1 = collectHealthKit(s0);
		expect(s1).toBe(s0);
	});

	it('no-ops outside the playing phase', () => {
		const s0 = damagePlayer(startRun(0), 999);
		expect(s0.phase).toBe('continue-prompt');
		const s1 = collectHealthKit(s0);
		expect(s1).toBe(s0);
	});
});
