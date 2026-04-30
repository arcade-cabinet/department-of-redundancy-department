import { describe, expect, it } from 'vitest';
import { createRng } from '@/world/generator/rng';
import { pickSpawnSet } from './spawnDirector';

describe('spawn director', () => {
	it('low tier (t<2) → only middle-managers', () => {
		const set = pickSpawnSet(0, 5, createRng('test'));
		expect(set.every((e) => e.slug === 'middle-manager')).toBe(true);
	});

	it('police tier (2 ≤ t < 4) → exactly 1 policeman per set', () => {
		for (let i = 0; i < 10; i++) {
			const set = pickSpawnSet(3, 5, createRng(`s-${i}`));
			const police = set.filter((e) => e.slug === 'policeman').length;
			expect(police).toBe(1);
			expect(set.length).toBe(5);
		}
	});

	it('hitman tier (4 ≤ t < 5) → 1 hitman + 1 police + managers', () => {
		const set = pickSpawnSet(4.5, 5, createRng('test-hit'));
		expect(set.filter((e) => e.slug === 'hitman').length).toBe(1);
		expect(set.filter((e) => e.slug === 'policeman').length).toBe(1);
	});

	it('swat tier (5 ≤ t < 8) → 1 swat + 1 hitman + 1 police', () => {
		const set = pickSpawnSet(6, 5, createRng('test-swat'));
		expect(set.filter((e) => e.slug === 'swat').length).toBe(1);
		expect(set.filter((e) => e.slug === 'hitman').length).toBe(1);
		expect(set.filter((e) => e.slug === 'policeman').length).toBe(1);
	});

	it('squad tier (t ≥ 8) → 2-3 SWATs sharing a squad id', () => {
		const set = pickSpawnSet(10, 5, createRng('test-squad'));
		const swats = set.filter((e) => e.slug === 'swat');
		expect(swats.length).toBeGreaterThanOrEqual(2);
		expect(swats.length).toBeLessThanOrEqual(3);
		// All SWATs in the same squad.
		const squads = new Set(swats.map((s) => s.squad));
		expect(squads.size).toBe(1);
	});

	it('count=0 returns empty', () => {
		expect(pickSpawnSet(5, 0, createRng('x'))).toEqual([]);
	});

	it('deterministic for same (threat, count, seed)', () => {
		const a = pickSpawnSet(3, 5, createRng('determinism-test'));
		const b = pickSpawnSet(3, 5, createRng('determinism-test'));
		expect(a).toEqual(b);
	});

	it('hitman tier with count=1 → just the hitman', () => {
		const set = pickSpawnSet(4.5, 1, createRng('test-hit-1'));
		expect(set.length).toBe(1);
		expect(set[0]?.slug).toBe('hitman');
	});
});
