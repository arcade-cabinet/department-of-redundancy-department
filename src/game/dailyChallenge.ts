/**
 * Daily Challenge modifier — once-per-UTC-day mutation drawn from a curated
 * pool. Selection is deterministic: `dayOfYear(utcDate) % poolLength`. No PRNG,
 * no persisted seed file. Adding modifiers post-launch is a content-only update.
 *
 * Spec: docs/spec/03-difficulty-and-modifiers.md § Daily Challenge.
 *
 * This module owns the modifier pool + the date → modifier function. The
 * modifier's *gameplay effect* is the responsibility of the systems that read
 * the active modifier off RunState — most modifiers are one-shot mutations
 * applied at level construction (no per-frame conditional sprawl).
 */

export type DailyModifierId =
	| 'no-reload'
	| 'headshots-only'
	| 'speed-run'
	| 'permadeath'
	| 'no-hud'
	| 'civilian-rush'
	| 'spray-and-pray'
	| 'iron-man'
	| 'reaper-friends'
	| 'justice-only'
	| 'sticky-aim'
	| 'mass-pop-madness'
	| 'boss-rush'
	| 'backwards'
	| 'charge-week'
	| 'glass-cannon'
	| 'pistol-only'
	| 'rifle-only';

export interface DailyModifierDef {
	readonly id: DailyModifierId;
	readonly title: string;
	readonly tagline: string;
}

// Order is stable. Inserting OR appending changes existing date→modifier
// mappings (selection is `dayOfYear % length`, so any change to length shifts
// the cycle). For the post-launch leaderboard contract, the pool must be
// effectively frozen — if we want to add modifiers without reshuffling old
// days, that needs a date-anchored selection scheme, not modulo. Documented
// here rather than fixed: the v1 leaderboard ships with this 18-entry pool
// and we accept that any future expansion is a leaderboard-resetting event.
export const DAILY_MODIFIERS: readonly DailyModifierDef[] = [
	{ id: 'no-reload', title: 'NO RELOAD', tagline: 'Auto-reload at end of mag. No manual.' },
	{ id: 'headshots-only', title: 'HEADSHOTS ONLY', tagline: 'Body shots do nothing.' },
	{ id: 'speed-run', title: 'SPEED RUN', tagline: 'Time bonus 3×. Civilian penalty halved.' },
	{ id: 'permadeath', title: 'PERMADEATH', tagline: 'One life. Score 1.5×.' },
	{ id: 'no-hud', title: 'NO HUD', tagline: 'Reticle only. Trust your gut.' },
	{ id: 'civilian-rush', title: 'CIVILIAN RUSH', tagline: 'Civilian density doubled.' },
	{ id: 'spray-and-pray', title: 'SPRAY AND PRAY', tagline: 'Weapons get +50% spread.' },
	{ id: 'iron-man', title: 'IRON MAN', tagline: 'No continues. Death is final.' },
	{ id: 'reaper-friends', title: 'THE REAPER HAS FRIENDS', tagline: '+2 SWAT per Reaper phase.' },
	{ id: 'justice-only', title: 'JUSTICE ONLY', tagline: 'Justice-shot bonus is your only score.' },
	{ id: 'sticky-aim', title: 'STICKY AIM', tagline: 'Slight aim assist on red reticles.' },
	{
		id: 'mass-pop-madness',
		title: 'MASS-POP MADNESS',
		tagline: 'Two mass-pops per cubicle floor.',
	},
	{ id: 'boss-rush', title: 'BOSS RUSH', tagline: 'Lobby intro → Reaper. Skip the floors.' },
	{ id: 'backwards', title: 'BACKWARDS', tagline: 'Boardroom first. Lobby last.' },
	{ id: 'charge-week', title: 'CHARGE WEEK', tagline: 'Charge beats spawn at 3× density.' },
	{ id: 'glass-cannon', title: 'GLASS CANNON', tagline: 'Damage 3×. HP halved.' },
	{ id: 'pistol-only', title: 'PISTOL ONLY', tagline: 'Rifle disabled. Pistol unlimited.' },
	{ id: 'rifle-only', title: 'RIFLE ONLY', tagline: 'Pistol disabled. Rifle unlimited.' },
];

/**
 * Day-of-year for a UTC instant, 1-indexed (Jan 1 = 1). Computed by
 * subtracting Dec 31 of the previous year (UTC) from the UTC midnight of the
 * input date and dividing by ms-per-day. Reading the input via `date.getTime()`
 * after a date-only normalization guarantees a sub-day offset (noon, 23:59)
 * still resolves to the correct day.
 */
export function dayOfYearUtc(date: Date): number {
	const start = Date.UTC(date.getUTCFullYear(), 0, 0);
	const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	return Math.floor((utcMidnight - start) / 86_400_000);
}

// O(1) id → def lookup. Built once at module load. Used by HudOverlay.render
// and any per-frame consumer.
const MODIFIER_BY_ID: ReadonlyMap<DailyModifierId, DailyModifierDef> = new Map(
	DAILY_MODIFIERS.map((m) => [m.id, m] as const),
);

/**
 * Deterministic daily-modifier selection. Same UTC date → same modifier
 * worldwide. Resets at midnight UTC.
 */
export function selectDailyModifier(date: Date = new Date()): DailyModifierDef {
	const idx = dayOfYearUtc(date) % DAILY_MODIFIERS.length;
	// Modulo over a non-empty array — index is always valid. The non-null
	// assertion is safe and avoids dead-code branches.
	// biome-ignore lint/style/noNonNullAssertion: idx ∈ [0, length) by modulo
	return DAILY_MODIFIERS[idx]!;
}

export function getDailyModifier(id: DailyModifierId): DailyModifierDef {
	const def = MODIFIER_BY_ID.get(id);
	if (!def) throw new Error(`Unknown daily modifier: ${id}`);
	return def;
}
