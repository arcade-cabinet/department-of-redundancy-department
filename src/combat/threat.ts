/**
 * Threat scalar math. Spec §10 (locked):
 *
 * Events (Δ on a per-event basis):
 *   middle-manager kill  +1.0
 *   policeman kill       +2.0
 *   hitman kill          +2.5
 *   swat kill            +3.0
 *   in-game minute idle  -0.05
 *   new floor entered    -0.5
 *
 * Threat is persisted on world_meta and clamps at 0 (never negative).
 * The spec's 0..∞ range is honored — there's no upper cap, so a
 * persistent player can drive it arbitrarily high during a long
 * session, and the spawn director fires the highest-tier band when
 * that happens.
 *
 * Pure functions: callers (Game.tsx, save loop, world.setThreat) own
 * the scalar; this module just folds events into it.
 */

export type EnemyKillSlug = 'middle-manager' | 'policeman' | 'hitman' | 'swat';

export const KILL_DELTAS: Readonly<Record<EnemyKillSlug, number>> = Object.freeze({
	'middle-manager': 1.0,
	policeman: 2.0,
	hitman: 2.5,
	swat: 3.0,
});

/** Idle decay: -0.05 per in-game minute = -0.05/60 per second. */
export const IDLE_DECAY_PER_SECOND = 0.05 / 60;

/** Floor-entry one-shot relief. */
export const FLOOR_ENTER_DELTA = -0.5;

/** Apply a kill event. Threat clamps at 0. */
export function onKill(threat: number, slug: EnemyKillSlug): number {
	const next = threat + (KILL_DELTAS[slug] ?? 0);
	return Math.max(0, next);
}

/** Drain over `elapsedSeconds` of game time. */
export function decay(threat: number, elapsedSeconds: number): number {
	if (elapsedSeconds <= 0) return threat;
	const next = threat - IDLE_DECAY_PER_SECOND * elapsedSeconds;
	return Math.max(0, next);
}

/** One-shot relief on floor entry. */
export function onFloorEnter(threat: number): number {
	return Math.max(0, threat + FLOOR_ENTER_DELTA);
}

/** Tier band the spawn director uses to pick the spawn pool. */
export type ThreatTier = 'low' | 'police' | 'hitman' | 'swat' | 'squad';

export function tierFor(threat: number): ThreatTier {
	if (threat >= 8) return 'squad';
	if (threat >= 5) return 'swat';
	if (threat >= 4) return 'hitman';
	if (threat >= 2) return 'police';
	return 'low';
}

/** Tier thresholds (used by ThreatStrip pulse animation). */
export const TIER_THRESHOLDS = [2, 4, 5, 8] as const;

/** Did `prev → next` cross any of the tier thresholds upward? Returns
 *  the highest crossed threshold (caller fires one pulse) or null. */
export function crossedThresholdUp(prev: number, next: number): number | null {
	if (next <= prev) return null;
	let highest: number | null = null;
	for (const t of TIER_THRESHOLDS) {
		if (prev < t && next >= t) highest = t;
	}
	return highest;
}
