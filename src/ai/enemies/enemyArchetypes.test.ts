import { describe, expect, it } from 'vitest';
import {
	archetypeStats,
	HITMAN_STEALTH_VISION_MULTIPLIER,
	POLICE_CALL_BACKUP_HP_FRACTION,
} from './enemyArchetypes';

describe('enemyArchetypes', () => {
	it('every alpha tier has stats', () => {
		const slugs = ['middle-manager', 'policeman', 'hitman', 'swat'] as const;
		for (const s of slugs) {
			const stats = archetypeStats(s);
			expect(stats.maxHp).toBeGreaterThan(0);
			expect(stats.walkSpeed).toBeGreaterThan(0);
			expect(stats.visionFovRad).toBeGreaterThan(0);
			expect(stats.visionRange).toBeGreaterThan(0);
			expect(stats.weaponDamage).toBeGreaterThan(0);
		}
	});

	it('higher tiers have higher kill-threat deltas', () => {
		const m = archetypeStats('middle-manager').killThreatDelta;
		const p = archetypeStats('policeman').killThreatDelta;
		const h = archetypeStats('hitman').killThreatDelta;
		const s = archetypeStats('swat').killThreatDelta;
		expect(p).toBeGreaterThan(m);
		expect(h).toBeGreaterThan(p);
		expect(s).toBeGreaterThan(h);
	});

	it('hitman has narrowest cone, longest range (sniper profile)', () => {
		const h = archetypeStats('hitman');
		const m = archetypeStats('middle-manager');
		expect(h.visionFovRad).toBeLessThan(m.visionFovRad);
		expect(h.visionRange).toBeGreaterThan(m.visionRange);
	});

	it('swat has AOE damage; others single-target', () => {
		expect(archetypeStats('swat').weaponAoeRadius).toBeGreaterThan(0);
		expect(archetypeStats('middle-manager').weaponAoeRadius).toBe(0);
		expect(archetypeStats('policeman').weaponAoeRadius).toBe(0);
		expect(archetypeStats('hitman').weaponAoeRadius).toBe(0);
	});

	it('policeman has 50% HP backup-trigger', () => {
		expect(POLICE_CALL_BACKUP_HP_FRACTION).toBe(0.5);
	});

	it('hitman stealth halves the vision multiplier', () => {
		expect(HITMAN_STEALTH_VISION_MULTIPLIER).toBe(0.5);
	});
});
