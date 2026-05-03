import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, it } from 'vitest';
import type { EncounterDirector } from '../encounter/EncounterDirector';
import type { Enemy } from '../encounter/Enemy';
import { type PickResult, resolveEnemyPickTarget, reticleColorFor } from './picking';

/**
 * Unit tests for the reticle color-routing logic in `picking.ts`.
 *
 * `reticleColorFor` is pure: it consumes a PickResult + a director (or null)
 * + a per-enemy spawn-HP map and returns one of five hue states. Tests pin
 * the priority chain documented in the file header:
 *
 *   civilian       → blue
 *   health-kit     → green
 *   enemy + open justice window → gold (regardless of HP)
 *   enemy + HP > 66% spawn      → red
 *   enemy + HP 33-66% spawn     → orange
 *   enemy + HP ≤ 33% spawn      → green
 *   anything else / no director → green
 */

function fakeEnemy(id: string, hp: number): Enemy {
	return {
		id,
		archetypeId: 'middle-manager',
		fireProgramId: 'pistol-pop-aim',
		rail: {
			graph: { nodes: [], edges: [] },
			currentNodeId: 'n0',
			elapsedOnEdgeMs: 0,
			atEnd: false,
		} as unknown as Enemy['rail'],
		elapsedMs: 0,
		nextFireEventIdx: 0,
		hp,
		state: 'firing',
		position: new Vector3(0, 0, 0),
		ceaseAfterMs: null,
		alerted: true,
		hostageCivilianRailId: null,
	};
}

interface DirectorStub {
	isJusticeWindowOpen: (id: string) => boolean;
	getEnemy: (id: string) => Enemy | undefined;
}

function fakeDirector(opts: {
	justiceOpenFor?: Set<string>;
	enemies?: Map<string, Enemy>;
}): EncounterDirector {
	const stub: DirectorStub = {
		isJusticeWindowOpen: (id: string) => opts.justiceOpenFor?.has(id) ?? false,
		getEnemy: (id: string) => opts.enemies?.get(id),
	};
	return stub as unknown as EncounterDirector;
}

describe('reticleColorFor', () => {
	it('returns blue over a civilian (overrides everything)', () => {
		const pick: PickResult = { kind: 'civilian', civilianId: 'civ-1' };
		expect(reticleColorFor(pick, null, new Map())).toBe('blue');
	});

	it('returns green over a health-kit', () => {
		const pick: PickResult = { kind: 'health-kit', healthKitId: 'hk-1' };
		expect(reticleColorFor(pick, null, new Map())).toBe('green');
	});

	it('returns green over air', () => {
		const pick: PickResult = { kind: 'air' };
		expect(reticleColorFor(pick, null, new Map())).toBe('green');
	});

	it('returns green when pick is enemy but director is null', () => {
		const pick: PickResult = { kind: 'enemy', enemyId: 'e1', target: 'body' };
		expect(reticleColorFor(pick, null, new Map([['e1', 100]]))).toBe('green');
	});

	it('returns gold over enemy when justice window is open (overrides HP color)', () => {
		const enemy = fakeEnemy('e1', 5); // very low HP — would normally be green
		const director = fakeDirector({
			justiceOpenFor: new Set(['e1']),
			enemies: new Map([['e1', enemy]]),
		});
		const pick: PickResult = { kind: 'enemy', enemyId: 'e1', target: 'body' };
		expect(reticleColorFor(pick, director, new Map([['e1', 100]]))).toBe('gold');
	});

	it('returns red over a fresh enemy (HP > 66% spawn)', () => {
		const enemy = fakeEnemy('e1', 80);
		const director = fakeDirector({ enemies: new Map([['e1', enemy]]) });
		const pick: PickResult = { kind: 'enemy', enemyId: 'e1', target: 'body' };
		expect(reticleColorFor(pick, director, new Map([['e1', 100]]))).toBe('red');
	});

	it('returns orange over a damaged enemy (33% < HP ≤ 66% spawn)', () => {
		const enemy = fakeEnemy('e1', 50);
		const director = fakeDirector({ enemies: new Map([['e1', enemy]]) });
		const pick: PickResult = { kind: 'enemy', enemyId: 'e1', target: 'body' };
		expect(reticleColorFor(pick, director, new Map([['e1', 100]]))).toBe('orange');
	});

	it('returns green over a near-dead enemy (HP ≤ 33% spawn)', () => {
		const enemy = fakeEnemy('e1', 20);
		const director = fakeDirector({ enemies: new Map([['e1', enemy]]) });
		const pick: PickResult = { kind: 'enemy', enemyId: 'e1', target: 'body' };
		expect(reticleColorFor(pick, director, new Map([['e1', 100]]))).toBe('green');
	});

	it('returns green when enemy spawn HP is missing from the map', () => {
		const enemy = fakeEnemy('e1', 80);
		const director = fakeDirector({ enemies: new Map([['e1', enemy]]) });
		const pick: PickResult = { kind: 'enemy', enemyId: 'e1', target: 'body' };
		expect(reticleColorFor(pick, director, new Map())).toBe('green');
	});

	it('returns green when spawn HP is zero (avoids divide-by-zero)', () => {
		const enemy = fakeEnemy('e1', 50);
		const director = fakeDirector({ enemies: new Map([['e1', enemy]]) });
		const pick: PickResult = { kind: 'enemy', enemyId: 'e1', target: 'body' };
		expect(reticleColorFor(pick, director, new Map([['e1', 0]]))).toBe('green');
	});

	it('returns red just above the 66% threshold', () => {
		// Pin the upper-band edge: 67/100 = 0.67 > 0.66 → red.
		const enemy = fakeEnemy('e1', 67);
		const director = fakeDirector({ enemies: new Map([['e1', enemy]]) });
		const pick: PickResult = { kind: 'enemy', enemyId: 'e1', target: 'body' };
		expect(reticleColorFor(pick, director, new Map([['e1', 100]]))).toBe('red');
	});

	it('returns green at exactly 33% HP (boundary falls through orange)', () => {
		// Pin the lower-band edge: 33/100 = 0.33. The implementation uses
		// `frac > 0.33` (strict), so 0.33 is NOT orange and falls to green.
		const enemy = fakeEnemy('e1', 33);
		const director = fakeDirector({ enemies: new Map([['e1', enemy]]) });
		const pick: PickResult = { kind: 'enemy', enemyId: 'e1', target: 'body' };
		expect(reticleColorFor(pick, director, new Map([['e1', 100]]))).toBe('green');
	});
});

describe('resolveEnemyPickTarget', () => {
	// `fromTopFrac` is the hit's distance from the top of the capsule,
	// normalised to [0,1]. Below 0.5 = head end; above 0.5 = body end.
	// Justice override applies only when the director confirms the window
	// is open AND the hit lands in the archetype's band.

	it('returns "head" when fromTopFrac < 0.5 and no director', () => {
		expect(resolveEnemyPickTarget('e1', 0.2, null)).toBe('head');
		expect(resolveEnemyPickTarget('e1', 0.49, null)).toBe('head');
	});

	it('returns "body" when fromTopFrac >= 0.5 and no director', () => {
		expect(resolveEnemyPickTarget('e1', 0.5, null)).toBe('body');
		expect(resolveEnemyPickTarget('e1', 0.9, null)).toBe('body');
	});

	it('falls back to head/body when the director reports the window closed', () => {
		const enemy = fakeEnemy('e1', 60);
		const director = fakeDirector({ enemies: new Map([['e1', enemy]]) });
		// middle-manager → tie-knot band (center 0.2). The hit IS in the band
		// but the window is CLOSED — must NOT route as justice.
		expect(resolveEnemyPickTarget('e1', 0.2, director)).toBe('head');
	});

	it('routes to "justice" when the window is open AND the hit lands in the archetype band', () => {
		// middle-manager: justiceShotTarget = 'tie-knot' → bandCenter 0.2,
		// bandTol 0.1. fromTopFrac=0.2 is dead-center.
		const enemy = fakeEnemy('e1', 60); // archetypeId middle-manager (per fakeEnemy default)
		const director = fakeDirector({
			justiceOpenFor: new Set(['e1']),
			enemies: new Map([['e1', enemy]]),
		});
		expect(resolveEnemyPickTarget('e1', 0.2, director)).toBe('justice');
		expect(resolveEnemyPickTarget('e1', 0.15, director)).toBe('justice'); // edge
		expect(resolveEnemyPickTarget('e1', 0.3, director)).toBe('justice'); // edge
	});

	it('falls back to head/body when the window is open but the hit is OUTSIDE the band', () => {
		// middle-manager band is [0.1, 0.3]. Hit at 0.5 is outside → body.
		const enemy = fakeEnemy('e1', 60);
		const director = fakeDirector({
			justiceOpenFor: new Set(['e1']),
			enemies: new Map([['e1', enemy]]),
		});
		expect(resolveEnemyPickTarget('e1', 0.5, director)).toBe('body');
		expect(resolveEnemyPickTarget('e1', 0.05, director)).toBe('head'); // outside on the high-tol side
	});

	it('falls back to head/body when the window claims open but the enemy is gone', () => {
		// Director.isJusticeWindowOpen returns true but getEnemy returns
		// undefined (enemy died in the same tick). Defensive: must not crash
		// or claim justice without an enemy.
		const director = fakeDirector({
			justiceOpenFor: new Set(['e1']),
			enemies: new Map(), // no entry for e1
		});
		expect(resolveEnemyPickTarget('e1', 0.2, director)).toBe('head');
	});
});
