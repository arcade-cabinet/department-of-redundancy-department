import { describe, expect, it } from 'vitest';
import {
	DAILY_FLAGS_INERT,
	DAILY_MODIFIERS,
	dailyModifierFlags,
	dayOfYearUtc,
	selectDailyModifier,
} from './dailyChallenge';

describe('dayOfYearUtc', () => {
	it('returns 1 for Jan 1', () => {
		expect(dayOfYearUtc(new Date('2026-01-01T00:00:00Z'))).toBe(1);
	});

	it('returns 1 for Jan 1 at noon (sub-day stays on day 1)', () => {
		expect(dayOfYearUtc(new Date('2026-01-01T12:00:00Z'))).toBe(1);
	});

	it('returns 1 for Jan 1 at 23:59:59 (last second of day 1)', () => {
		expect(dayOfYearUtc(new Date('2026-01-01T23:59:59Z'))).toBe(1);
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

	// Order is the source of truth for the leaderboard contract: the same
	// dayOfYear must select the same modifier across all clients today and
	// forever after launch. A mid-array insertion silently passes uniqueness
	// + count tests while breaking that contract globally. This snapshot is
	// the only guard that catches an accidental reorder at review time.
	it('id order is stable — append-only post-launch (do not reorder)', () => {
		expect(DAILY_MODIFIERS.map((m) => m.id)).toEqual([
			'no-reload',
			'headshots-only',
			'speed-run',
			'permadeath',
			'no-hud',
			'civilian-rush',
			'spray-and-pray',
			'iron-man',
			'reaper-friends',
			'justice-only',
			'sticky-aim',
			'mass-pop-madness',
			'boss-rush',
			'backwards',
			'charge-week',
			'glass-cannon',
			'pistol-only',
			'rifle-only',
		]);
	});
});

describe('dailyModifierFlags', () => {
	it('returns inert flags for null', () => {
		expect(dailyModifierFlags(null)).toEqual(DAILY_FLAGS_INERT);
	});

	it('no-hud sets hideHud only', () => {
		expect(dailyModifierFlags('no-hud')).toEqual({ ...DAILY_FLAGS_INERT, hideHud: true });
	});

	it('headshots-only sets headshotsOnly only', () => {
		expect(dailyModifierFlags('headshots-only')).toEqual({
			...DAILY_FLAGS_INERT,
			headshotsOnly: true,
		});
	});

	it('pistol-only implies noReload', () => {
		const flags = dailyModifierFlags('pistol-only');
		expect(flags.pistolOnly).toBe(true);
		expect(flags.noReload).toBe(true);
		expect(flags.rifleOnly).toBe(false);
	});

	it('rifle-only implies noReload', () => {
		const flags = dailyModifierFlags('rifle-only');
		expect(flags.rifleOnly).toBe(true);
		expect(flags.noReload).toBe(true);
		expect(flags.pistolOnly).toBe(false);
	});

	it('no-reload sets noReload without locking weapon', () => {
		const flags = dailyModifierFlags('no-reload');
		expect(flags.noReload).toBe(true);
		expect(flags.pistolOnly).toBe(false);
		expect(flags.rifleOnly).toBe(false);
	});

	it('every modifier id is exhaustively handled (no missing branch)', () => {
		// If any modifier returns undefined, the destructuring would throw.
		for (const m of DAILY_MODIFIERS) {
			const flags = dailyModifierFlags(m.id);
			expect(typeof flags.hideHud).toBe('boolean');
		}
	});

	it('content-system modifiers ship as inert flags in v1', () => {
		// Documented in the directive — these need level-router or content
		// changes that don't reduce to a per-tick boolean. Pinning the
		// inert-flag invariant so a partial implementation can't ship by
		// accident.
		const inertIds = [
			'speed-run',
			'civilian-rush',
			'spray-and-pray',
			'reaper-friends',
			'sticky-aim',
			'mass-pop-madness',
			'boss-rush',
			'backwards',
			'charge-week',
			'permadeath',
		] as const;
		for (const id of inertIds) {
			expect(dailyModifierFlags(id)).toEqual(DAILY_FLAGS_INERT);
		}
	});
});
