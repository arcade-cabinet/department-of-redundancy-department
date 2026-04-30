import { describe, expect, it } from 'vitest';
import { freshCurrency } from '@/ecs/components/WeaponCurrency';
import { canUpgrade, upgradeCost } from './upgrade';

describe('upgrade', () => {
	it('T1→T2 costs 4 coffee + 8 binder-clips', () => {
		expect(upgradeCost('T1', 'T2')).toEqual({ coffee: 4, binderClips: 8 });
	});

	it('T2→T3 costs 8 coffee + 12 binder-clips + 4 donuts + 1 briefcase', () => {
		expect(upgradeCost('T2', 'T3')).toEqual({
			coffee: 8,
			binderClips: 12,
			donuts: 4,
			briefcases: 1,
		});
	});

	it('returns null for invalid pairs (same tier or downgrade)', () => {
		expect(upgradeCost('T1', 'T1')).toBeNull();
		expect(upgradeCost('T3', 'T2')).toBeNull();
	});

	it('canUpgrade false on empty wallet', () => {
		expect(canUpgrade(freshCurrency(), 'T1', 'T2')).toBe(false);
	});

	it('canUpgrade true when wallet covers cost', () => {
		const wallet = { coffee: 5, binderClips: 10, donuts: 0, briefcases: 0 };
		expect(canUpgrade(wallet, 'T1', 'T2')).toBe(true);
	});
});
