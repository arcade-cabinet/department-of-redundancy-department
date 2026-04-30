import type { Rng } from '@/world/generator/rng';

/**
 * Traps (PRQ-B3, M4). Five interactive hazards spec §22.2 calls for —
 * tag-driven so the rewireable-as-turret behavior in M5 polish can
 * branch on the slug.
 *
 * The R3F mounts (visible meshes + collision triggers) land in M5
 * BETA-POLISH alongside the audio polish; this commit ships the
 * pure-data type table + spawn picker so downstream e2e + spawn
 * director tests can use the surface immediately.
 */

export type TrapSlug =
	| 'paper-shredder'
	| 'electrified-keyboard'
	| 'falling-monitor'
	| 'hot-coffee-tile'
	| 'whiteboard-marker-trap';

export interface TrapStats {
	slug: TrapSlug;
	damage: number;
	cooldownMs: number;
	radius: number;
	/** True if the trap can be rewired into a turret post-discovery
	 *  (M5 polish wires the radial action). */
	rewireable: boolean;
}

const TABLE: Readonly<Record<TrapSlug, TrapStats>> = Object.freeze({
	'paper-shredder': {
		slug: 'paper-shredder',
		damage: 25,
		cooldownMs: 1500,
		radius: 0.4,
		rewireable: true,
	},
	'electrified-keyboard': {
		slug: 'electrified-keyboard',
		damage: 18,
		cooldownMs: 2500,
		radius: 0.6,
		rewireable: true,
	},
	'falling-monitor': {
		slug: 'falling-monitor',
		damage: 40,
		cooldownMs: 5000,
		radius: 0.5,
		rewireable: false,
	},
	'hot-coffee-tile': {
		slug: 'hot-coffee-tile',
		damage: 8,
		cooldownMs: 800,
		radius: 0.7,
		rewireable: false,
	},
	'whiteboard-marker-trap': {
		slug: 'whiteboard-marker-trap',
		damage: 5,
		cooldownMs: 400,
		radius: 0.3,
		rewireable: true,
	},
});

export function trapStats(slug: TrapSlug): TrapStats {
	return TABLE[slug];
}

export function knownTrapSlugs(): readonly string[] {
	return Object.keys(TABLE);
}

/** Pick a deterministic set of traps for a floor. Higher floors get
 *  more (the spawn director's threat tier should drive `count`). */
export function pickTrapSet(count: number, rng: Rng): TrapSlug[] {
	if (count <= 0) return [];
	const slugs = Object.keys(TABLE) as TrapSlug[];
	const out: TrapSlug[] = [];
	for (let i = 0; i < count; i++) {
		out.push(rng.pick(slugs));
	}
	return out;
}
