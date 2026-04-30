import { describe, expect, it } from 'vitest';
import {
	applyDebuff,
	clearExpired,
	freshDebuffSet,
	hasDebuff,
	REAPER_DEBUFF_DURATION_S,
	REAPER_SPEED_MULTIPLIER,
	speedMultiplier,
} from './debuffs';

describe('debuff system', () => {
	it('fresh set is empty', () => {
		const ds = freshDebuffSet();
		expect(hasDebuff(ds, 'reaper-redaction')).toBe(false);
		expect(speedMultiplier(ds)).toBe(1);
	});

	it('reaper-redaction applies for 4s', () => {
		expect(REAPER_DEBUFF_DURATION_S).toBe(4);
		let ds = freshDebuffSet();
		ds = applyDebuff(ds, 'reaper-redaction', 10);
		expect(hasDebuff(ds, 'reaper-redaction')).toBe(true);
		expect(speedMultiplier(ds)).toBe(REAPER_SPEED_MULTIPLIER);
		expect(REAPER_SPEED_MULTIPLIER).toBe(0.6);
	});

	it('debuff clears after duration elapses', () => {
		let ds = freshDebuffSet();
		ds = applyDebuff(ds, 'reaper-redaction', 10);
		// At now=13.5 (still within 4s window) — present.
		ds = clearExpired(ds, 13.5);
		expect(hasDebuff(ds, 'reaper-redaction')).toBe(true);
		// At now=14.1 (past 4s window) — gone.
		ds = clearExpired(ds, 14.1);
		expect(hasDebuff(ds, 'reaper-redaction')).toBe(false);
		expect(speedMultiplier(ds)).toBe(1);
	});

	it('re-applying a debuff refreshes the timer', () => {
		let ds = freshDebuffSet();
		ds = applyDebuff(ds, 'reaper-redaction', 10);
		ds = applyDebuff(ds, 'reaper-redaction', 13);
		ds = clearExpired(ds, 14.5);
		expect(hasDebuff(ds, 'reaper-redaction')).toBe(true); // not yet expired (13 + 4 = 17)
	});
});
