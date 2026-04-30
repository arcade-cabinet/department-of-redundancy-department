import { describe, expect, it } from 'vitest';
import { buildWeaponsTable, weaponStatsFor } from './weapons';

const FIXTURE = {
	weapons: [
		{
			slug: 'staple-rifle',
			name: 'Staple Rifle',
			kind: 'hitscan',
			audioCueOnFire: 'staple-rifle-fire',
			viewmodel: { glb: 'weapon-ak47.glb', gripSlug: 'ak47' },
			tiers: {
				T1: { damage: 8, ammoCap: 30, cooldownMs: 120, range: 18, spreadDeg: 4 },
				T2: { damage: 11.2, ammoCap: 45, cooldownMs: 102, range: 18, spreadDeg: 3.2 },
				T3: { damage: 14.8, ammoCap: 63, cooldownMs: 84, range: 18, spreadDeg: 2.2 },
			},
		},
	],
};

describe('weapons table', () => {
	it('parses a tiered weapon', () => {
		const map = buildWeaponsTable(FIXTURE);
		const w = map.get('staple-rifle');
		expect(w).toBeDefined();
		expect(w?.kind).toBe('hitscan');
		expect(w?.tiers.T1.damage).toBe(8);
		expect(w?.tiers.T3.damage).toBe(14.8);
	});

	it('weaponStatsFor returns the requested tier stats', () => {
		const map = buildWeaponsTable(FIXTURE);
		const w = map.get('staple-rifle')!;
		expect(weaponStatsFor(w, 'T2').cooldownMs).toBe(102);
	});

	it('throws if a tier is missing', () => {
		const base = FIXTURE.weapons[0] as (typeof FIXTURE.weapons)[number];
		const bad = { weapons: [{ ...base, tiers: { T1: base.tiers.T1 } }] };
		expect(() => buildWeaponsTable(bad)).toThrow(/T2/);
	});
});
