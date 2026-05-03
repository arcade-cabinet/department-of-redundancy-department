import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { FireEvent, FirePatternId } from './FirePattern';
import type { SpawnRailState } from './SpawnRail';

/**
 * Archetype id — mirrors docs/spec/02-encounter-vocabulary.md table.
 *
 * Lore mapping (the IDs are stable internal handles; in-fiction labels are):
 *   security-guard  — Office Security Guard (rank-and-file uniformed staff)
 *   middle-manager  — Middle Manager (the most numerous threat)
 *   hitman          — Hitman (corporate-contracted assassin)
 *   swat            — Head of Security (the office's tactical-response tier)
 *   reaper          — The Reaper of HR (final boss)
 */
export type ArchetypeId = 'security-guard' | 'middle-manager' | 'hitman' | 'swat' | 'reaper';

export type JusticeTargetKind = 'weapon-hand' | 'tie-knot' | 'scythe-shaft';

export interface Archetype {
	readonly id: ArchetypeId;
	readonly glb: string;
	readonly hp: number;
	readonly weakpoint: 'head' | 'scythe-jewel' | 'body';
	readonly justiceShotTarget: JusticeTargetKind;
	readonly bodyDamage: number;
	readonly headDamage: number;
}

/**
 * Per-archetype justice-shot geometry. Single source of truth for both the
 * picker (band test) AND the glint VFX placement — keeping them in two
 * tables drifted easily, so they're unified here next to the archetypes.
 *
 * `bandCenter` / `bandTol` are y-fractions measured from the top of the
 * capsule (range [0, 1]). The picker tests `|fromTop/height − center| ≤ tol`.
 *
 * `glintLocalYFraction` is derived from `bandCenter`: in the capsule's frame
 * (center = 0, top = +halfHeight, bottom = −halfHeight), the local Y of a
 * point at `fromTop = bandCenter * height` is `halfHeight * (1 - 2 * bandCenter)`.
 * Stored as that multiplier so `glint.position.y = halfHeight * fraction`
 * is one line at the call site.
 */
export interface JusticeTarget {
	readonly bandCenter: number;
	readonly bandTol: number;
	readonly glintLocalYFraction: number;
}

function makeTarget(bandCenter: number, bandTol: number): JusticeTarget {
	return { bandCenter, bandTol, glintLocalYFraction: 1 - 2 * bandCenter };
}

export const JUSTICE_TARGETS: Readonly<Record<JusticeTargetKind, JusticeTarget>> = {
	'tie-knot': makeTarget(0.2, 0.1),
	'weapon-hand': makeTarget(0.65, 0.15),
	'scythe-shaft': makeTarget(0.5, 0.4),
};

export const ARCHETYPES: Readonly<Record<ArchetypeId, Archetype>> = {
	'security-guard': {
		id: 'security-guard',
		glb: 'characters/security-guard.glb',
		hp: 80,
		weakpoint: 'head',
		justiceShotTarget: 'weapon-hand',
		bodyDamage: 100,
		headDamage: 250,
	},
	'middle-manager': {
		id: 'middle-manager',
		glb: 'characters/middle-manager.glb',
		hp: 60,
		weakpoint: 'head',
		justiceShotTarget: 'tie-knot',
		bodyDamage: 100,
		headDamage: 250,
	},
	hitman: {
		id: 'hitman',
		glb: 'characters/hitman.glb',
		hp: 100,
		weakpoint: 'head',
		justiceShotTarget: 'weapon-hand',
		bodyDamage: 100,
		headDamage: 250,
	},
	swat: {
		id: 'swat',
		glb: 'characters/head-of-security.glb',
		hp: 140,
		weakpoint: 'head',
		justiceShotTarget: 'weapon-hand',
		bodyDamage: 100,
		headDamage: 250,
	},
	reaper: {
		id: 'reaper',
		glb: 'characters/hr-reaper.glb',
		hp: 1500,
		weakpoint: 'scythe-jewel',
		justiceShotTarget: 'scythe-shaft',
		bodyDamage: 100,
		headDamage: 250,
	},
};

export type EnemyState = 'sliding' | 'firing' | 'ceasing' | 'dead';

/**
 * An enemy is a dumb prop. The director ticks it; it cannot decide anything.
 * It rides a SpawnRailState, plays a fire-program tape, emits FireEvents, and
 * tracks HP that the director debits.
 */
export interface Enemy {
	readonly id: string;
	readonly archetypeId: ArchetypeId;
	readonly fireProgramId: FirePatternId;
	readonly rail: SpawnRailState;
	readonly elapsedMs: number;
	readonly nextFireEventIdx: number;
	readonly hp: number;
	readonly state: EnemyState;
	readonly position: Vector3;
	/** Director-issued; null until set. */
	readonly ceaseAfterMs: number | null;
	/** True once the director's `on-alert` signal has fired (used by pre-aggro programs). */
	readonly alerted: boolean;
	/**
	 * For `hostage-threat` enemies: the civilian rail whose active
	 * civilian is claimed if this enemy completes its threat program.
	 * Authored by the level via `enemy-spawn` cue's `hostageCivilianRailId`.
	 * Null for enemies not paired with a hostage. PRQ A.9.
	 */
	readonly hostageCivilianRailId: string | null;
}

export interface EnemyTickResult {
	readonly enemy: Enemy;
	readonly emitted: readonly FireEvent[];
}
