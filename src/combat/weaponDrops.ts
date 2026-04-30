import type { Tier } from '@/ecs/components/Equipped';
import { createRng } from '@/world/generator/rng';
import type { ThreatTier } from './threat';

export interface WeaponDrop {
	slug: string;
	tier: Tier;
}

interface PoolEntry {
	slug: string;
	tier: Tier;
	weight: number;
}

// Pools keyed off threat tier. Each tier inherits the previous tier's
// pool and adds new rarer/stronger entries (classic FPS escalation).
const POOLS: Record<ThreatTier, PoolEntry[]> = {
	low: [
		{ slug: 'staple-rifle', tier: 'T1', weight: 5 },
		{ slug: 'expense-report-smg', tier: 'T1', weight: 4 },
	],
	police: [
		{ slug: 'staple-rifle', tier: 'T1', weight: 4 },
		{ slug: 'expense-report-smg', tier: 'T1', weight: 4 },
		{ slug: 'binder-blaster', tier: 'T1', weight: 3 },
		{ slug: 'staple-rifle', tier: 'T2', weight: 1 },
	],
	hitman: [
		{ slug: 'staple-rifle', tier: 'T1', weight: 2 },
		{ slug: 'expense-report-smg', tier: 'T2', weight: 3 },
		{ slug: 'binder-blaster', tier: 'T1', weight: 3 },
		{ slug: 'severance-special', tier: 'T1', weight: 2 },
	],
	swat: [
		{ slug: 'expense-report-smg', tier: 'T2', weight: 2 },
		{ slug: 'binder-blaster', tier: 'T2', weight: 3 },
		{ slug: 'severance-special', tier: 'T1', weight: 2 },
		{ slug: 'toner-cannon', tier: 'T1', weight: 2 },
		{ slug: 'compliance-incinerator', tier: 'T1', weight: 2 },
	],
	squad: [
		{ slug: 'binder-blaster', tier: 'T2', weight: 2 },
		{ slug: 'severance-special', tier: 'T2', weight: 2 },
		{ slug: 'toner-cannon', tier: 'T2', weight: 2 },
		{ slug: 'compliance-incinerator', tier: 'T2', weight: 2 },
		{ slug: 'staple-rifle', tier: 'T3', weight: 1 },
		{ slug: 'expense-report-smg', tier: 'T3', weight: 1 },
		{ slug: 'severance-special', tier: 'T3', weight: 1 },
	],
};

const DROP_RATE: Record<ThreatTier, number> = {
	low: 0.3,
	police: 0.4,
	hitman: 0.5,
	swat: 0.7,
	squad: 1.0,
};

export function pickWeaponDrop(seed: string, floor: number, tier: ThreatTier): WeaponDrop | null {
	const rng = createRng(`${seed}::weapon-drop::floor-${floor}`);
	const dropRoll = rng.next();
	if (dropRoll >= DROP_RATE[tier]) return null;
	const pool = POOLS[tier];
	const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
	let pick = rng.next() * totalWeight;
	for (const entry of pool) {
		pick -= entry.weight;
		if (pick <= 0) return { slug: entry.slug, tier: entry.tier };
	}
	const last = pool[pool.length - 1];
	return last ? { slug: last.slug, tier: last.tier } : null;
}
