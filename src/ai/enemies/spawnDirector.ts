import { tierFor } from '@/combat/threat';
import type { Rng } from '@/world/generator/rng';

/**
 * Spawn director. Maps threat → spawn pool per spec §10.
 *
 *   0 ≤ t < 2 → middle-manager only
 *   2 ≤ t < 4 → + occasional policeman (≤1 per spawn-set)
 *   4 ≤ t < 5 → + 1 hitman (stealth)
 *   5 ≤ t < 8 → + 1 swat
 *   8 ≤ t     → + swat squads (2-3)
 *
 * Returns N entries; the runtime spawner positions them. "Occasional"
 * police at the police tier means: pool has police+manager weighted so
 * roughly 1 in N spawns is a police; we pick at most 1 police per
 * spawn-set so the player isn't immediately swamped on threshold cross.
 */

export type SpawnSlug = 'middle-manager' | 'policeman' | 'hitman' | 'swat';

export interface SpawnEntry {
	slug: SpawnSlug;
	/** Optional squad id — same id means same SquadMemory. */
	squad?: string;
}

/**
 * Pick `count` entries deterministically. Uses the supplied Rng so
 * the same (threat, count, seed) produces the same set across reloads
 * (call sites use the per-spawn track from `${seed}::spawn::floor-${N}`
 * or a derivative).
 */
export function pickSpawnSet(threat: number, count: number, rng: Rng): SpawnEntry[] {
	if (count <= 0) return [];
	const tier = tierFor(threat);
	switch (tier) {
		case 'low':
			return Array.from({ length: count }, () => ({ slug: 'middle-manager' as const }));
		case 'police':
			return policeTier(count, rng);
		case 'hitman':
			return hitmanTier(count, rng);
		case 'swat':
			return swatTier(count, rng);
		case 'squad':
			return squadTier(count, rng);
	}
}

function policeTier(count: number, rng: Rng): SpawnEntry[] {
	// One police max per spawn-set; rest are managers. Police occupies a
	// random slot in the set so the player can't memorize the order.
	const out: SpawnEntry[] = Array.from({ length: count }, () => ({
		slug: 'middle-manager' as const,
	}));
	const policeSlot = rng.int(0, count - 1);
	out[policeSlot] = { slug: 'policeman' };
	return out;
}

function hitmanTier(count: number, rng: Rng): SpawnEntry[] {
	// One hitman + one police + rest managers. Hitman always present at
	// this tier per spec ("+1 hitman").
	const out: SpawnEntry[] = Array.from({ length: count }, () => ({
		slug: 'middle-manager' as const,
	}));
	if (count >= 1) {
		const hitmanSlot = rng.int(0, count - 1);
		out[hitmanSlot] = { slug: 'hitman' };
	}
	if (count >= 2) {
		// Pick a different slot for police.
		let policeSlot = rng.int(0, count - 1);
		while (out[policeSlot]?.slug === 'hitman' && count >= 2) {
			policeSlot = (policeSlot + 1) % count;
		}
		out[policeSlot] = { slug: 'policeman' };
	}
	return out;
}

function swatTier(count: number, rng: Rng): SpawnEntry[] {
	// One SWAT + one hitman + rest split police/managers.
	const out: SpawnEntry[] = Array.from({ length: count }, () => ({
		slug: 'middle-manager' as const,
	}));
	const placed = new Set<number>();
	const place = (slug: SpawnSlug) => {
		if (count === 0) return;
		let i = rng.int(0, count - 1);
		while (placed.has(i)) i = (i + 1) % count;
		placed.add(i);
		out[i] = { slug };
	};
	place('swat');
	if (count >= 2) place('hitman');
	if (count >= 3) place('policeman');
	return out;
}

function squadTier(count: number, rng: Rng): SpawnEntry[] {
	// SWAT squad: 2-3 SWATs share a squad id; rest are higher-tier
	// individuals. Squad size is min(3, count), so very small spawn
	// sets just get a 2-SWAT squad.
	const squadSize = Math.min(3, Math.max(2, count));
	const squadId = `squad-${rng.next().toFixed(6)}`;
	const out: SpawnEntry[] = [];
	for (let i = 0; i < squadSize; i++) out.push({ slug: 'swat', squad: squadId });
	for (let i = squadSize; i < count; i++) {
		// Fill remaining with hitman + police mix.
		out.push({ slug: rng.next() < 0.5 ? 'hitman' : 'policeman' });
	}
	return rng.shuffle(out);
}
