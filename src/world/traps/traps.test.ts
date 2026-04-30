import { describe, expect, it } from 'vitest';
import { createRng } from '@/world/generator/rng';
import { knownTrapSlugs, pickTrapSet, type TrapSlug, trapStats } from './traps';

describe('traps (PRQ-B3)', () => {
	it('exposes 5 trap slugs', () => {
		expect(knownTrapSlugs().length).toBeGreaterThanOrEqual(5);
	});

	it('every trap has a damage + cooldownMs', () => {
		for (const slug of knownTrapSlugs() as readonly TrapSlug[]) {
			const stats = trapStats(slug);
			expect(stats.damage).toBeGreaterThan(0);
			expect(stats.cooldownMs).toBeGreaterThan(0);
		}
	});

	it('pickTrapSet is deterministic for same (rng, count)', () => {
		const a = pickTrapSet(3, createRng('seed-A'));
		const b = pickTrapSet(3, createRng('seed-A'));
		expect(a).toEqual(b);
	});

	it('count=0 returns empty', () => {
		expect(pickTrapSet(0, createRng('seed-A'))).toEqual([]);
	});

	it('higher floors get more traps deterministically', () => {
		const five = pickTrapSet(5, createRng('seed-X'));
		expect(five.length).toBe(5);
	});
});
