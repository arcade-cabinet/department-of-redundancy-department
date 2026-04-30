import { describe, expect, it } from 'vitest';
import {
	DAMAGE_PER_UNIT,
	FREE_FALL_HEIGHT,
	fallDamageFor,
	freshFallRecord,
	MAX_FALL_DAMAGE,
	tickFall,
} from './fallDamage';

describe('fallDamage', () => {
	it('drops within free-fall do no damage', () => {
		expect(fallDamageFor(0)).toBe(0);
		expect(fallDamageFor(1)).toBe(0);
		expect(fallDamageFor(FREE_FALL_HEIGHT)).toBe(0);
	});

	it('damage = (drop - 3) * 8 above the free-fall threshold', () => {
		expect(fallDamageFor(4)).toBe(DAMAGE_PER_UNIT);
		expect(fallDamageFor(5)).toBe(DAMAGE_PER_UNIT * 2);
		expect(fallDamageFor(8)).toBe(DAMAGE_PER_UNIT * 5);
	});

	it('caps at MAX_FALL_DAMAGE', () => {
		expect(fallDamageFor(100)).toBe(MAX_FALL_DAMAGE);
		expect(fallDamageFor(1000)).toBe(MAX_FALL_DAMAGE);
	});

	it('tickFall: grounded → grounded is no-op', () => {
		const r = tickFall(freshFallRecord(), true, true, 0.8);
		expect(r.damage).toBe(0);
		expect(r.record.startY).toBeNull();
	});

	it('tickFall: take-off records startY', () => {
		const r = tickFall(freshFallRecord(), true, false, 5);
		expect(r.damage).toBe(0);
		expect(r.record.startY).toBe(5);
	});

	it('tickFall: airborne stays in flight; no damage until landing', () => {
		const start = tickFall(freshFallRecord(), true, false, 5);
		const mid = tickFall(start.record, false, false, 3);
		expect(mid.damage).toBe(0);
		expect(mid.record.startY).toBe(5);
	});

	it('tickFall: landing applies damage = drop above free-fall', () => {
		const start = tickFall(freshFallRecord(), true, false, 10);
		const land = tickFall(start.record, false, true, 1);
		expect(land.damage).toBe((9 - FREE_FALL_HEIGHT) * DAMAGE_PER_UNIT);
		expect(land.record.startY).toBeNull();
	});

	it('tickFall: short drop lands without damage', () => {
		const start = tickFall(freshFallRecord(), true, false, 2);
		const land = tickFall(start.record, false, true, 0);
		expect(land.damage).toBe(0);
	});
});
