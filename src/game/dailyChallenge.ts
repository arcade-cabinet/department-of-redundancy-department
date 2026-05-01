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

// Order is stable — append-only post-launch. Inserting in the middle would
// shift the daily-modifier sequence for every existing leaderboard entry.
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
 * Day-of-year for a UTC instant, 1-indexed (Jan 1 = 1). Pure function, no
 * timezone dependency: callers must pass a `Date` already constructed at the
 * desired wall-clock instant. We read UTC components only.
 */
export function dayOfYearUtc(date: Date): number {
	const start = Date.UTC(date.getUTCFullYear(), 0, 0);
	const now = Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
		date.getUTCHours(),
		date.getUTCMinutes(),
		date.getUTCSeconds(),
	);
	return Math.floor((now - start) / 86_400_000);
}

/**
 * Deterministic daily-modifier selection. Same UTC date → same modifier
 * worldwide. Resets at midnight UTC.
 */
export function selectDailyModifier(date: Date = new Date()): DailyModifierDef {
	const idx = dayOfYearUtc(date) % DAILY_MODIFIERS.length;
	const def = DAILY_MODIFIERS[idx];
	if (!def) throw new Error(`Daily modifier index out of range: ${idx}`);
	return def;
}

export function getDailyModifier(id: DailyModifierId): DailyModifierDef {
	const def = DAILY_MODIFIERS.find((m) => m.id === id);
	if (!def) throw new Error(`Unknown daily modifier: ${id}`);
	return def;
}
