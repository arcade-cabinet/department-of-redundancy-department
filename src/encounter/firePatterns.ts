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
};

export function getFirePattern(id: FirePatternId): FirePattern {
	const pattern = FIRE_PATTERNS[id];
	if (!pattern) {
		throw new Error(`Unknown fire pattern: ${id}`);
	}
	return pattern;
}
