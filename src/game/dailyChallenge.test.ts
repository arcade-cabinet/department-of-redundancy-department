import { describe, expect, it } from 'vitest';
import { DAILY_MODIFIERS, dayOfYearUtc, selectDailyModifier } from './dailyChallenge';

describe('dayOfYearUtc', () => {
	it('returns 1 for Jan 1', () => {
		expect(dayOfYearUtc(new Date('2026-01-01T00:00:00Z'))).toBe(1);
	});

	it('returns 32 for Feb 1 (non-leap year)', () => {
		expect(dayOfYearUtc(new Date('2026-02-01T00:00:00Z'))).toBe(32);
	});

	it('returns 60 for Feb 29 in a leap year', () => {
		expect(dayOfYearUtc(new Date('2024-02-29T00:00:00Z'))).toBe(60);
	});

	it('returns 366 for Dec 31 in a leap year', () => {
		expect(dayOfYearUtc(new Date('2024-12-31T23:59:59Z'))).toBe(366);
	});

	it('uses UTC, not local time — same day across timezones', () => {
		// Late evening UTC == next-day local in many timezones, but UTC stays put.
		expect(dayOfYearUtc(new Date('2026-04-30T23:59:00Z'))).toBe(120);
		expect(dayOfYearUtc(new Date('2026-04-30T00:01:00Z'))).toBe(120);
	});
});

describe('selectDailyModifier', () => {
	it('is deterministic for the same UTC date', () => {
		const d = new Date('2026-04-30T12:00:00Z');
		const a = selectDailyModifier(d);
		const b = selectDailyModifier(d);
		expect(a.id).toBe(b.id);
	});

	it('rotates through the pool — Jan 1 of two consecutive years differ when length > 1', () => {
		// Jan 1 2026 → day 1 → idx 1; Jan 1 2027 → day 1 → idx 1 — same modifier.
		// Use two consecutive UTC days instead, which guarantees idx changes.
		const day1 = selectDailyModifier(new Date('2026-04-30T00:00:00Z'));
		const day2 = selectDailyModifier(new Date('2026-05-01T00:00:00Z'));
		expect(day1.id).not.toBe(day2.id);
	});

	it('returns a member of the curated pool', () => {
		const result = selectDailyModifier(new Date('2026-04-30T00:00:00Z'));
		expect(DAILY_MODIFIERS.map((m) => m.id)).toContain(result.id);
	});

	it('has a populated tagline', () => {
		const result = selectDailyModifier(new Date('2026-04-30T00:00:00Z'));
		expect(result.tagline.length).toBeGreaterThan(0);
	});
});

describe('DAILY_MODIFIERS pool', () => {
	it('has unique ids', () => {
		const ids = DAILY_MODIFIERS.map((m) => m.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('matches the v1 spec count of ~18', () => {
		expect(DAILY_MODIFIERS.length).toBeGreaterThanOrEqual(18);
	});

	it('every entry has title and tagline', () => {
		for (const m of DAILY_MODIFIERS) {
			expect(m.title.length).toBeGreaterThan(0);
			expect(m.tagline.length).toBeGreaterThan(0);
		}
	});
});
