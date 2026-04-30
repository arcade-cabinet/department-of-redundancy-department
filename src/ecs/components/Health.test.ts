import { describe, expect, it } from 'vitest';
import {
	applyDamage,
	DAMAGE_FLASH_MS,
	fractionRemaining,
	freshHealth,
	isDead,
	MANAGER_MAX_HP,
	PLAYER_MAX_HP,
	tickDamageFlash,
} from './Health';

describe('Health component', () => {
	it('freshHealth(max) sets current = max', () => {
		const h = freshHealth(PLAYER_MAX_HP);
		expect(h.current).toBe(PLAYER_MAX_HP);
		expect(h.max).toBe(PLAYER_MAX_HP);
		expect(h.damageFlashTimer).toBe(0);
	});

	it('applyDamage clamps to 0', () => {
		const h = freshHealth(MANAGER_MAX_HP);
		const h2 = applyDamage(h, 20);
		expect(h2.current).toBe(10);
		const h3 = applyDamage(h2, 50);
		expect(h3.current).toBe(0);
	});

	it('applyDamage resets flash timer', () => {
		const h = freshHealth(100);
		const h2 = applyDamage(h, 10);
		expect(h2.damageFlashTimer).toBe(DAMAGE_FLASH_MS);
	});

	it('zero or negative damage is a no-op', () => {
		const h = freshHealth(100);
		expect(applyDamage(h, 0)).toBe(h);
		expect(applyDamage(h, -5)).toBe(h);
	});

	it('tickDamageFlash decrements toward 0', () => {
		const h = applyDamage(freshHealth(100), 10);
		const t = tickDamageFlash(h, 100);
		expect(t.damageFlashTimer).toBe(DAMAGE_FLASH_MS - 100);
		const t2 = tickDamageFlash(t, 999);
		expect(t2.damageFlashTimer).toBe(0);
	});

	it('tickDamageFlash on already-zero is no-op (returns same ref)', () => {
		const h = freshHealth(100);
		expect(tickDamageFlash(h, 16)).toBe(h);
	});

	it('isDead at current=0', () => {
		const h = freshHealth(10);
		expect(isDead(h)).toBe(false);
		expect(isDead(applyDamage(h, 100))).toBe(true);
	});

	it('fractionRemaining is in [0, 1]', () => {
		const h = freshHealth(100);
		expect(fractionRemaining(h)).toBe(1);
		expect(fractionRemaining(applyDamage(h, 25))).toBeCloseTo(0.75, 5);
		expect(fractionRemaining(applyDamage(h, 200))).toBe(0);
	});
});
