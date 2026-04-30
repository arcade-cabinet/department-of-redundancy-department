import type { Tier } from '@/ecs/components/Equipped';
import { canAfford, type CurrencyCost, type WeaponCurrency } from '@/ecs/components/WeaponCurrency';

const COST_TABLE: Partial<Record<`${Tier}->${Tier}`, CurrencyCost>> = {
	'T1->T2': { coffee: 4, binderClips: 8 },
	'T2->T3': { coffee: 8, binderClips: 12, donuts: 4, briefcases: 1 },
};

export function upgradeCost(from: Tier, to: Tier): CurrencyCost | null {
	return COST_TABLE[`${from}->${to}`] ?? null;
}

export function canUpgrade(wallet: WeaponCurrency, from: Tier, to: Tier): boolean {
	const cost = upgradeCost(from, to);
	if (!cost) return false;
	return canAfford(wallet, cost);
}

export function nextTier(from: Tier): Tier | null {
	if (from === 'T1') return 'T2';
	if (from === 'T2') return 'T3';
	return null;
}
