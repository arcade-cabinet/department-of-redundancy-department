import { describe, expect, test } from 'vitest';
import { ARCHETYPES, JUSTICE_TARGETS } from './Enemy';

describe('Enemy archetype + justice-target tables', () => {
	test('every ArchetypeId in ARCHETYPES has a matching id field', () => {
		for (const [key, val] of Object.entries(ARCHETYPES)) {
			expect(val.id).toBe(key);
		}
	});

	test('all archetypes share consistent body/head damage (the spec promises 100/250 universally)', () => {
		for (const archetype of Object.values(ARCHETYPES)) {
			expect(archetype.bodyDamage).toBe(100);
			expect(archetype.headDamage).toBe(250);
		}
	});

	test('reaper has the highest HP (boss)', () => {
		const allHp = Object.values(ARCHETYPES).map((a) => a.hp);
		expect(ARCHETYPES.reaper.hp).toBe(Math.max(...allHp));
		expect(ARCHETYPES.reaper.hp).toBeGreaterThan(1000);
	});

	test('every archetype has a justiceShotTarget that exists in JUSTICE_TARGETS', () => {
		for (const archetype of Object.values(ARCHETYPES)) {
			expect(JUSTICE_TARGETS[archetype.justiceShotTarget]).toBeDefined();
		}
	});

	test('every archetype glb path looks like characters/<name>.glb', () => {
		for (const archetype of Object.values(ARCHETYPES)) {
			expect(archetype.glb).toMatch(/^characters\/[a-z][a-z-]+\.glb$/);
		}
	});

	test('JUSTICE_TARGETS glintLocalYFraction is derived correctly from bandCenter', () => {
		// Capsule frame: center = 0, top = +halfHeight, bottom = −halfHeight.
		// A point at fromTop = bandCenter * height has local Y =
		// halfHeight * (1 − 2 * bandCenter). Stored as the multiplier.
		for (const target of Object.values(JUSTICE_TARGETS)) {
			expect(target.glintLocalYFraction).toBeCloseTo(1 - 2 * target.bandCenter, 9);
		}
	});

	test('tie-knot lands above center (positive Y multiplier — head end)', () => {
		// bandCenter 0.2 from top → glintLocalYFraction = 1 − 0.4 = 0.6
		expect(JUSTICE_TARGETS['tie-knot'].glintLocalYFraction).toBeGreaterThan(0);
	});

	test('weapon-hand lands below center (negative Y multiplier — body end)', () => {
		// bandCenter 0.65 from top → glintLocalYFraction = 1 − 1.3 = −0.3
		expect(JUSTICE_TARGETS['weapon-hand'].glintLocalYFraction).toBeLessThan(0);
	});

	test('JUSTICE_TARGETS bandTol values are positive', () => {
		for (const target of Object.values(JUSTICE_TARGETS)) {
			expect(target.bandTol).toBeGreaterThan(0);
		}
	});
});
