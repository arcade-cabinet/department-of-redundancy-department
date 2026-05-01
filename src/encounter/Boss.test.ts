import { describe, expect, it } from 'vitest';
import { BOSSES, bossEnemyId, bossIdForEnemy } from './Boss';

describe('bossIdForEnemy', () => {
	it('round-trips every BOSSES entry through bossEnemyId', () => {
		for (const id of Object.keys(BOSSES)) {
			expect(bossIdForEnemy(bossEnemyId(id as keyof typeof BOSSES))).toBe(id);
		}
	});

	it('returns null for non-boss enemy ids', () => {
		expect(bossIdForEnemy('grunt-001')).toBeNull();
		expect(bossIdForEnemy('boss-doesntexist')).toBeNull();
		expect(bossIdForEnemy('boss-')).toBeNull();
		expect(bossIdForEnemy('')).toBeNull();
	});
});

describe('BOSSES quarter drops', () => {
	it('every entry has a non-empty drop range', () => {
		for (const def of Object.values(BOSSES)) {
			const [min, max] = def.quarterDrop;
			expect(min).toBeGreaterThanOrEqual(0);
			expect(max).toBeGreaterThanOrEqual(min);
		}
	});

	it('the Reaper drops 5 (final-boss canon)', () => {
		expect(BOSSES.reaper.quarterDrop).toEqual([5, 5]);
	});
});
