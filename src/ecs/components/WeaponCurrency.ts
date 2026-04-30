/**
 * WeaponCurrency: per-run wallet of pickup-derived upgrade currency.
 * Spec §weapon-progression: every pickup credits both health/ammo
 * (existing applyPickup behavior) AND tallies one unit of its kind
 * here for spending at the workbench.
 */

export interface WeaponCurrency {
	coffee: number;
	binderClips: number;
	donuts: number;
	briefcases: number;
}

export type CurrencyKind = keyof WeaponCurrency;

export type CurrencyCost = Partial<WeaponCurrency>;

export function freshCurrency(): WeaponCurrency {
	return { coffee: 0, binderClips: 0, donuts: 0, briefcases: 0 };
}

export function addCurrency(w: WeaponCurrency, kind: CurrencyKind, n = 1): WeaponCurrency {
	return { ...w, [kind]: w[kind] + n };
}

export function canAfford(wallet: WeaponCurrency, cost: CurrencyCost): boolean {
	for (const [k, v] of Object.entries(cost) as [CurrencyKind, number][]) {
		if ((wallet[k] ?? 0) < v) return false;
	}
	return true;
}

export function spendCurrency(wallet: WeaponCurrency, cost: CurrencyCost): WeaponCurrency {
	if (!canAfford(wallet, cost)) throw new Error('cannot afford cost');
	const out = { ...wallet };
	for (const [k, v] of Object.entries(cost) as [CurrencyKind, number][]) {
		out[k] = out[k] - v;
	}
	return out;
}
