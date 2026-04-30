import { describe, expect, it } from 'vitest';
import { knownTierSlugs, tierStyleFor } from './tierStyles';

const ROSTER = ['middle-manager', 'policeman', 'swat', 'hitman', 'hr-reaper'];

describe('tier styles', () => {
	it('every roster slug has an entry', () => {
		for (const slug of ROSTER) {
			const t = tierStyleFor(slug);
			expect(t, `${slug} entry`).not.toBeNull();
			expect(t?.scale).toBeGreaterThan(0);
			expect(t?.walkSpeed).toBeGreaterThan(0);
			expect(t?.audioCueOnSpawn).toBeTruthy();
		}
	});

	it('unknown slug returns null', () => {
		expect(tierStyleFor('unknown')).toBeNull();
	});

	it('knownTierSlugs() lists every roster entry', () => {
		const known = knownTierSlugs();
		for (const slug of ROSTER) expect(known).toContain(slug);
	});

	it('tier scale increases with rank (manager < police < hitman)', () => {
		const m = tierStyleFor('middle-manager');
		const p = tierStyleFor('policeman');
		const h = tierStyleFor('hitman');
		expect(m && p && h).toBeTruthy();
		expect(p?.scale ?? 0).toBeGreaterThanOrEqual(m?.scale ?? 0);
		expect(h?.scale ?? 0).toBeGreaterThan(m?.scale ?? 0);
	});
});
