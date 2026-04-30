import { describe, expect, it } from 'vitest';
import { addCurrency, canAfford, freshCurrency, spendCurrency, type CurrencyCost } from './WeaponCurrency';

describe('WeaponCurrency', () => {
	it('starts at zero across all four kinds', () => {
		const c = freshCurrency();
		expect(c).toEqual({ coffee: 0, binderClips: 0, donuts: 0, briefcases: 0 });
	});

	it('addCurrency increments by kind', () => {
		const c = addCurrency(freshCurrency(), 'coffee', 3);
		expect(c.coffee).toBe(3);
		expect(c.binderClips).toBe(0);
	});

	it('canAfford true when wallet >= cost on every key', () => {
		const wallet = { coffee: 5, binderClips: 10, donuts: 0, briefcases: 0 };
		const cost: CurrencyCost = { coffee: 4, binderClips: 8 };
		expect(canAfford(wallet, cost)).toBe(true);
	});

	it('canAfford false when any single kind underfunded', () => {
		const wallet = { coffee: 5, binderClips: 0, donuts: 0, briefcases: 0 };
		const cost: CurrencyCost = { coffee: 4, binderClips: 8 };
		expect(canAfford(wallet, cost)).toBe(false);
	});

	it('spendCurrency deducts each kind in the cost', () => {
		const wallet = { coffee: 5, binderClips: 10, donuts: 0, briefcases: 0 };
		const cost: CurrencyCost = { coffee: 4, binderClips: 8 };
		const next = spendCurrency(wallet, cost);
		expect(next).toEqual({ coffee: 1, binderClips: 2, donuts: 0, briefcases: 0 });
	});

	it('spendCurrency throws when canAfford is false', () => {
		const wallet = freshCurrency();
		expect(() => spendCurrency(wallet, { coffee: 1 })).toThrow(/cannot afford/);
	});
});
