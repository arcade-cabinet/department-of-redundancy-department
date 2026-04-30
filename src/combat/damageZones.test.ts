import { describe, expect, it } from 'vitest';
import {
	applyZoneMultiplier,
	type DamageZone,
	HEAD_MULTIPLIER,
	LIMB_MULTIPLIER,
	TORSO_MULTIPLIER,
} from './damageZones';

describe('damage zones (PRQ-B6)', () => {
	it('head shot applies HEAD_MULTIPLIER', () => {
		expect(applyZoneMultiplier(10, 'head')).toBe(10 * HEAD_MULTIPLIER);
		expect(HEAD_MULTIPLIER).toBe(2.0);
	});

	it('torso shot applies TORSO_MULTIPLIER', () => {
		expect(applyZoneMultiplier(10, 'torso')).toBe(10 * TORSO_MULTIPLIER);
		expect(TORSO_MULTIPLIER).toBe(1.0);
	});

	it('limb shot applies LIMB_MULTIPLIER', () => {
		expect(applyZoneMultiplier(10, 'limbs')).toBe(10 * LIMB_MULTIPLIER);
		expect(LIMB_MULTIPLIER).toBe(0.6);
	});

	it('rounds to integer to keep HP math clean', () => {
		expect(applyZoneMultiplier(7, 'limbs')).toBe(Math.round(7 * 0.6));
	});

	it('returns 0 on 0 dmg regardless of zone', () => {
		const zones: DamageZone[] = ['head', 'torso', 'limbs'];
		for (const z of zones) expect(applyZoneMultiplier(0, z)).toBe(0);
	});
});
