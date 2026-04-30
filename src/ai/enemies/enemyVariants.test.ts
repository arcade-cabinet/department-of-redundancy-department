import { describe, expect, it } from 'vitest';
import { type EnemyVariant, enemyVariantStats, knownVariants } from './enemyVariants';

describe('enemy variants (PRQ-B7)', () => {
	it('known variants list includes baseline + tagged variants', () => {
		const variants = knownVariants();
		expect(variants).toContain('middle-manager-baseline');
		expect(variants).toContain('middle-manager-faxer');
		expect(variants).toContain('policeman-suppressor');
	});

	it('faxer middle-manager wields the fax-machine', () => {
		const stats = enemyVariantStats('middle-manager-faxer');
		expect(stats.weaponSlug).toBe('fax-machine');
	});

	it('baseline variants inherit base archetype stats', () => {
		const baseline = enemyVariantStats('middle-manager-baseline');
		expect(baseline.maxHp).toBe(30);
		expect(baseline.weaponSlug).toBe('three-hole-punch');
	});

	it('tagged variants tweak HP + walkSpeed', () => {
		const fast: EnemyVariant = 'policeman-suppressor';
		const stats = enemyVariantStats(fast);
		expect(stats.maxHp).toBeGreaterThan(0);
		expect(stats.walkSpeed).toBeGreaterThan(0);
	});
});
