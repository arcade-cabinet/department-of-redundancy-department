import type { FirePattern, FirePatternId } from './FirePattern';

/**
 * Canonical fire-program presets — one per row of docs/spec/02-encounter-vocabulary.md
 * fire-program table. Levels reference these by id; the director plays them as tapes.
 *
 * Times are in milliseconds since enemy spawn. The director ticks the enemy and
 * emits any events whose `atMs` is now in the past.
 */

export const FIRE_PATTERNS: Readonly<Record<FirePatternId, FirePattern>> = {
	'pistol-pop-aim': {
		id: 'pistol-pop-aim',
		loop: false,
		events: [
			{ atMs: 0, verb: 'idle' },
			{ atMs: 800, verb: 'aim-laser', durationMs: 800 },
			{ atMs: 1600, verb: 'fire-hitscan', damage: 15 },
			{ atMs: 1800, verb: 'idle' },
		],
	},
	'pistol-cover-pop': {
		id: 'pistol-cover-pop',
		loop: true,
		events: [
			{ atMs: 0, verb: 'duck' },
			{ atMs: 500, verb: 'pop-out' },
			{ atMs: 800, verb: 'aim-laser', durationMs: 500 },
			{ atMs: 1300, verb: 'fire-hitscan', damage: 10 },
			{ atMs: 1500, verb: 'duck' },
			{ atMs: 2200, verb: 'pop-out' },
		],
	},
	'vault-drop-fire': {
		id: 'vault-drop-fire',
		loop: false,
		// Fast spawn-rail traversal; aim happens once at end of slide.
		events: [
			{ atMs: 0, verb: 'idle' },
			{ atMs: 1500, verb: 'aim-laser', durationMs: 500 },
			{ atMs: 2000, verb: 'fire-hitscan', damage: 15 },
			{ atMs: 2200, verb: 'idle' },
		],
	},
	'crawler-lunge': {
		id: 'crawler-lunge',
		loop: false,
		events: [
			{ atMs: 0, verb: 'idle' },
			{ atMs: 1500, verb: 'aim-laser', durationMs: 1500 },
			{ atMs: 3000, verb: 'melee-contact', damage: 20, rangeM: 2.0 },
		],
	},
	'shamble-march': {
		id: 'shamble-march',
		loop: false,
		// Walks the whole spawn rail; melee on arrive.
		events: [
			{ atMs: 0, verb: 'idle' },
			{ atMs: 5000, verb: 'melee-contact', damage: 15, rangeM: 1.5 },
		],
	},
	'charge-sprint': {
		id: 'charge-sprint',
		loop: false,
		// Very fast spawn rail; melee on arrive.
		events: [
			{ atMs: 0, verb: 'idle' },
			{ atMs: 2000, verb: 'aim-laser', durationMs: 600 },
			{ atMs: 2600, verb: 'melee-contact', damage: 30, rangeM: 1.5 },
		],
	},
	'vehicle-dismount-burst': {
		id: 'vehicle-dismount-burst',
		loop: false,
		events: [
			// 200ms flinch lead per playtest #2.
			{ atMs: 0, verb: 'idle' },
			{ atMs: 200, verb: 'aim-laser', durationMs: 400 },
			{ atMs: 600, verb: 'fire-hitscan', damage: 15 },
			{ atMs: 1000, verb: 'aim-laser', durationMs: 400 },
			{ atMs: 1400, verb: 'fire-hitscan', damage: 15 },
		],
	},
	'drive-by-volley': {
		id: 'drive-by-volley',
		loop: false,
		events: [
			{ atMs: 0, verb: 'idle' },
			{ atMs: 700, verb: 'aim-laser', durationMs: 400 },
			{ atMs: 1100, verb: 'fire-hitscan', damage: 12 },
		],
	},
	'sniper-aim': {
		id: 'sniper-aim',
		loop: true,
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 1500 },
			{ atMs: 1500, verb: 'fire-hitscan', damage: 35 },
			{ atMs: 1700, verb: 'idle' },
			{ atMs: 2700, verb: 'aim-laser', durationMs: 1500 },
		],
	},
	'lob-throw': {
		id: 'lob-throw',
		loop: true,
		// 2.0s loop interval per playtest #6.
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 1000 },
			{ atMs: 1000, verb: 'projectile-throw', damage: 25, ttlMs: 1500 },
			{ atMs: 2000, verb: 'idle' },
		],
	},
	'hostage-threat': {
		id: 'hostage-threat',
		loop: false,
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 2500 },
			{ atMs: 2500, verb: 'fire-hitscan', damage: 50 },
		],
	},
	'mass-pop-volley': {
		id: 'mass-pop-volley',
		loop: false,
		// Director synchronises across N enemies via spawn cue.
		events: [
			{ atMs: 0, verb: 'duck' },
			{ atMs: 1000, verb: 'pop-out' },
			{ atMs: 1000, verb: 'aim-laser', durationMs: 400 },
			{ atMs: 1400, verb: 'fire-hitscan', damage: 10 },
			{ atMs: 1600, verb: 'duck' },
		],
	},
	'justice-glint': {
		id: 'justice-glint',
		loop: false,
		// Glint phase has weapon-hand exposed; player can disarm.
		events: [
			{ atMs: 0, verb: 'idle' },
			{ atMs: 300, verb: 'aim-laser', durationMs: 300 },
			{ atMs: 600, verb: 'fire-hitscan', damage: 12 },
		],
	},
	'civilian-walk': {
		id: 'civilian-walk',
		loop: false,
		events: [{ atMs: 0, verb: 'idle' }],
	},
	'pre-aggro-pistol-pop': {
		id: 'pre-aggro-pistol-pop',
		loop: false,
		preAggro: true,
		// Idle-until-alert prefix, then standard pistol-pop-aim sequence.
		events: [
			{ atMs: 0, verb: 'idle' },
			{ atMs: 2500, verb: 'aim-laser', durationMs: 800 },
			{ atMs: 3300, verb: 'fire-hitscan', damage: 15 },
			{ atMs: 3500, verb: 'idle' },
		],
	},
	idle: {
		id: 'idle',
		loop: false,
		events: [{ atMs: 0, verb: 'idle' }],
	},
	// ── Bespoke boss fire programs ───────────────────────────────────────────
	// Personality-driven: each named boss has a recognizable signature attack
	// rhythm. Damage values are tuned for the boss's HP budget (see BOSSES
	// hpMultiplier in Boss.ts) — heavy hits at slow cadence so the player has
	// time to react, faster jabs in the more frantic late phases.

	'garrison-burst': {
		// Security Chief Garrison phase 1: per docs/spec/levels/01-lobby.md
		// Normal is a single aimed shot every 2.0s. Difficulty-tier patterns
		// (3-round burst on Hard, cover-pop + ad spawns on Nightmare) are a
		// future per-difficulty selector slice — for now this is the shipped
		// Normal cadence: 800ms windup → fire → ~1.2s recovery → loop = 2s cycle.
		id: 'garrison-burst',
		loop: true,
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 800 },
			{ atMs: 800, verb: 'fire-hitscan', damage: 22 },
			{ atMs: 900, verb: 'idle' },
			{ atMs: 2000, verb: 'idle' },
		],
	},
	'whitcomb-throw': {
		// CFO Whitcomb: slow telegraphed lobs (stress-balls in spec, treated
		// as a projectile-throw with long travel).
		id: 'whitcomb-throw',
		loop: true,
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 1000 },
			{ atMs: 1000, verb: 'projectile-throw', damage: 20, ttlMs: 1500 },
			{ atMs: 2500, verb: 'idle' },
		],
	},
	'phelps-aim': {
		// HR Director Phelps phase 1: aimed pistol shots from her podium.
		id: 'phelps-aim',
		loop: true,
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 1100 },
			{ atMs: 1100, verb: 'fire-hitscan', damage: 18 },
			{ atMs: 1400, verb: 'idle' },
		],
	},
	'phelps-snipe': {
		// Phase 2: she retreats and switches to long-windup high-damage
		// sniper shots (mirroring sniper-aim shape but bespoke for tuning).
		id: 'phelps-snipe',
		loop: true,
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 1700 },
			{ atMs: 1700, verb: 'fire-hitscan', damage: 30 },
			{ atMs: 2000, verb: 'idle' },
		],
	},
	'crawford-suppress': {
		// COO Crawford phase 1: SWAT-trained — suppressing fire in cover-pop
		// rhythm with a slight stagger. The cycle ends in `duck` so the loop
		// restart at atMs:0 (also `duck`) is a no-op visually rather than a
		// pop-out → duck flicker.
		id: 'crawford-suppress',
		loop: true,
		events: [
			{ atMs: 0, verb: 'duck' },
			{ atMs: 400, verb: 'pop-out' },
			{ atMs: 700, verb: 'aim-laser', durationMs: 400 },
			{ atMs: 1100, verb: 'fire-hitscan', damage: 14 },
			{ atMs: 1300, verb: 'fire-hitscan', damage: 14 },
			{ atMs: 1500, verb: 'duck' },
			{ atMs: 2200, verb: 'idle' },
		],
	},
	'crawford-charge': {
		// Phase 2: he abandons cover and rushes — pistol-into-melee burst,
		// recovers, then loops so the pressure continues until the player
		// kills him.
		id: 'crawford-charge',
		loop: true,
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 500 },
			{ atMs: 500, verb: 'fire-hitscan', damage: 18 },
			{ atMs: 1000, verb: 'fire-hitscan', damage: 18 },
			{ atMs: 2200, verb: 'melee-contact', damage: 35, rangeM: 2.0 },
			{ atMs: 2400, verb: 'idle' },
			{ atMs: 3600, verb: 'idle' },
		],
	},
	'reaper-scythe-arc': {
		// Reaper phase 1: ranged scythe-energy projectile, high windup so the
		// player can read it as the title-card lands.
		id: 'reaper-scythe-arc',
		loop: true,
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 1400 },
			{ atMs: 1400, verb: 'projectile-throw', damage: 25, ttlMs: 1800 },
			{ atMs: 3200, verb: 'idle' },
		],
	},
	'reaper-volley': {
		// Phase 2: he stops aiming and unleashes a frantic three-shot volley
		// at faster cadence.
		id: 'reaper-volley',
		loop: true,
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 600 },
			{ atMs: 600, verb: 'fire-hitscan', damage: 18 },
			{ atMs: 900, verb: 'fire-hitscan', damage: 18 },
			{ atMs: 1200, verb: 'fire-hitscan', damage: 18 },
			{ atMs: 1500, verb: 'idle' },
		],
	},
	'reaper-rush': {
		// Phase 3: scythe charge. Telegraphed sprint into a heavy melee, then
		// a brief recovery before the next charge. Loops so the boss keeps
		// pressuring until the player kills it (HP-based, not program-based).
		id: 'reaper-rush',
		loop: true,
		events: [
			{ atMs: 0, verb: 'aim-laser', durationMs: 800 },
			{ atMs: 800, verb: 'melee-contact', damage: 50, rangeM: 1.8 },
			{ atMs: 1000, verb: 'idle' },
			{ atMs: 2400, verb: 'idle' },
		],
	},
};

export function getFirePattern(id: FirePatternId): FirePattern {
	const pattern = FIRE_PATTERNS[id];
	if (!pattern) {
		throw new Error(`Unknown fire pattern: ${id}`);
	}
	return pattern;
}
