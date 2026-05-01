import seedrandom from 'seedrandom';
import { describe, expect, it } from 'vitest';
import { rand } from './rng';

describe('engine/rng', () => {
	it('returns numbers in [0, 1) when no seed is set', () => {
		// In the unit-test environment there is no `?seed=` param, so `rand()`
		// falls through to `Math.random()`. We can only verify the contract.
		for (let i = 0; i < 100; i++) {
			const n = rand();
			expect(n).toBeGreaterThanOrEqual(0);
			expect(n).toBeLessThan(1);
		}
	});

	// `rand()` itself is a thin delegate to a module-init-time seeded PRNG.
	// We can't re-seed it after init in the same process, so we instead pin
	// the seedrandom contract directly — this proves that when `?seed=N` is
	// set, two runs with the same seed produce the same sequence.
	it('seedrandom produces a deterministic sequence for a fixed seed', () => {
		const a = seedrandom('dord-test');
		const b = seedrandom('dord-test');
		const seqA = Array.from({ length: 16 }, () => a());
		const seqB = Array.from({ length: 16 }, () => b());
		expect(seqA).toEqual(seqB);
	});

	it('seedrandom produces different sequences for different seeds', () => {
		const a = seedrandom('alpha');
		const b = seedrandom('beta');
		// First sample alone is enough to prove independence — comparing a
		// long prefix would be paranoid given seedrandom's well-known
		// avalanche behavior.
		expect(a()).not.toBe(b());
	});
});
