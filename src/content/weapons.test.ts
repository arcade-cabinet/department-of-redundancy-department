import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildWeaponsTable } from './weapons';

const here = dirname(fileURLToPath(import.meta.url));
const json = JSON.parse(
	readFileSync(join(here, '..', '..', 'public', 'content', 'weapons.json'), 'utf8'),
);

describe('weapons content', () => {
	it('shipped weapons.json validates and produces 6 entries (alpha 2 + beta 4)', () => {
		const table = buildWeaponsTable(json);
		expect(table.size).toBe(6);
		expect(table.has('stapler')).toBe(true);
		expect(table.has('three-hole-punch')).toBe(true);
		expect(table.has('letter-opener')).toBe(true);
		expect(table.has('whiteboard-marker')).toBe(true);
		expect(table.has('toner-cannon')).toBe(true);
		expect(table.has('fax-machine')).toBe(true);
	});

	it('toner-cannon is a high-damage projectile with 8 ammo cap', () => {
		const t = buildWeaponsTable(json);
		const w = t.get('toner-cannon');
		expect(w?.kind).toBe('projectile');
		if (w?.kind !== 'projectile') throw new Error('not projectile');
		expect(w.damage).toBe(35);
		expect(w.ammoCap).toBe(8);
	});

	it('fax-machine is a hitscan with 12 ammo + 22u range', () => {
		const t = buildWeaponsTable(json);
		const w = t.get('fax-machine');
		expect(w?.kind).toBe('hitscan');
		if (w?.kind !== 'hitscan') throw new Error('not hitscan');
		expect(w.damage).toBe(22);
		expect(w.range).toBe(22);
		expect(w.ammoCap).toBe(12);
	});

	it('stapler is melee with 12 dmg / 1.5u range / 400ms cooldown / 30° facing', () => {
		const t = buildWeaponsTable(json);
		const s = t.get('stapler');
		expect(s?.kind).toBe('melee');
		if (s?.kind !== 'melee') throw new Error('not melee');
		expect(s.damage).toBe(12);
		expect(s.range).toBe(1.5);
		expect(s.cooldownMs).toBe(400);
		expect(s.facingMaxDeg).toBe(30);
	});

	it('three-hole-punch is a 3-round burst at 6u/s with 25 ammo cap', () => {
		const t = buildWeaponsTable(json);
		const w = t.get('three-hole-punch');
		expect(w?.kind).toBe('projectile');
		if (w?.kind !== 'projectile') throw new Error('not projectile');
		expect(w.damage).toBe(8);
		expect(w.burstCount).toBe(3);
		expect(w.burstIntervalMs).toBe(80);
		expect(w.projectileSpeed).toBe(6);
		expect(w.ammoCap).toBe(25);
		expect(w.range).toBe(16);
		expect(w.projectileLifetimeMs).toBe(1000);
	});

	it('rejects malformed input', () => {
		expect(() => buildWeaponsTable(null)).toThrow();
		expect(() => buildWeaponsTable({})).toThrow();
		expect(() => buildWeaponsTable({ weapons: 'oops' })).toThrow();
		expect(() => buildWeaponsTable({ weapons: [{}] })).toThrow();
	});

	it('rejects unknown kind', () => {
		expect(() =>
			buildWeaponsTable({
				weapons: [
					{
						slug: 'x',
						name: 'X',
						kind: 'death-ray',
						damage: 1,
						range: 1,
						cooldownMs: 1,
						spreadDeg: 0,
						audioCueOnFire: 'x',
					},
				],
			}),
		).toThrow(/unknown weapon kind/);
	});
});
