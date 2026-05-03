import { describe, expect, test } from 'vitest';
import type { FirePatternId } from './FirePattern';
import { FIRE_PATTERNS, getFirePattern } from './firePatterns';

describe('FIRE_PATTERNS table integrity', () => {
	test('every FirePatternId in the union has a registered pattern', () => {
		const expectedIds: readonly FirePatternId[] = [
			'pistol-pop-aim',
			'pistol-cover-pop',
			'vault-drop-fire',
			'crawler-lunge',
			'shamble-march',
			'charge-sprint',
			'vehicle-dismount-burst',
			'drive-by-volley',
			'sniper-aim',
			'lob-throw',
			'hostage-threat',
			'mass-pop-volley',
			'justice-glint',
			'civilian-walk',
			'pre-aggro-pistol-pop',
			'idle',
			'garrison-burst',
			'garrison-enraged',
			'whitcomb-throw',
			'whitcomb-volley',
			'phelps-aim',
			'phelps-snipe',
			'crawford-suppress',
			'crawford-charge',
			'reaper-scythe-arc',
			'reaper-volley',
			'reaper-rush',
		];
		for (const id of expectedIds) {
			expect(FIRE_PATTERNS[id]).toBeDefined();
			expect(FIRE_PATTERNS[id].id).toBe(id);
		}
	});

	test('all event timelines are sorted ascending by atMs', () => {
		for (const pattern of Object.values(FIRE_PATTERNS)) {
			let prev = -Infinity;
			for (const event of pattern.events) {
				expect(event.atMs).toBeGreaterThanOrEqual(prev);
				prev = event.atMs;
			}
		}
	});

	test('every fire-hitscan / projectile-throw / melee-contact event has positive damage', () => {
		for (const pattern of Object.values(FIRE_PATTERNS)) {
			for (const event of pattern.events) {
				if (
					event.verb === 'fire-hitscan' ||
					event.verb === 'projectile-throw' ||
					event.verb === 'melee-contact'
				) {
					expect(event.damage).toBeGreaterThan(0);
				}
			}
		}
	});

	test('aim-laser events have positive durationMs', () => {
		for (const pattern of Object.values(FIRE_PATTERNS)) {
			for (const event of pattern.events) {
				if (event.verb === 'aim-laser') {
					expect(event.durationMs).toBeGreaterThan(0);
				}
			}
		}
	});

	test('reaper boss patterns deal more damage than rank-and-file patterns', () => {
		// reaper-rush has melee 50; charge-sprint (highest non-boss melee) has 30.
		const reaperRush = FIRE_PATTERNS['reaper-rush'].events.find((e) => e.verb === 'melee-contact');
		const chargeSprint = FIRE_PATTERNS['charge-sprint'].events.find(
			(e) => e.verb === 'melee-contact',
		);
		expect(reaperRush?.verb === 'melee-contact' ? reaperRush.damage : 0).toBeGreaterThan(
			chargeSprint?.verb === 'melee-contact' ? chargeSprint.damage : 0,
		);
	});

	test('idle pattern is empty/no-op (props that never fire)', () => {
		const idle = FIRE_PATTERNS.idle;
		expect(idle.events.every((e) => e.verb === 'idle')).toBe(true);
	});
});

describe('getFirePattern', () => {
	test('returns the pattern for a known id', () => {
		const pattern = getFirePattern('pistol-pop-aim');
		expect(pattern.id).toBe('pistol-pop-aim');
	});

	test('throws on an unknown id', () => {
		// Cast through unknown to bypass the union narrowing — this models
		// the "data-driven id from level config snuck past the type system"
		// case the runtime guards.
		expect(() => getFirePattern('not-a-real-id' as unknown as FirePatternId)).toThrow(
			/Unknown fire pattern/,
		);
	});
});
