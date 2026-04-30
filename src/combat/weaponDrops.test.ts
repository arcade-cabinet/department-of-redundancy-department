import { describe, expect, it } from 'vitest';
import { pickWeaponDrop } from './weaponDrops';

describe('weaponDrops', () => {
	it('low tier never drops a high-tier weapon', () => {
		for (let f = 1; f <= 3; f++) {
			const drop = pickWeaponDrop('seed-A', f, 'low');
			if (drop) {
				expect(['staple-rifle', 'expense-report-smg']).toContain(drop.slug);
				expect(drop.tier).toBe('T1');
			}
		}
	});

	it('squad tier can drop T3 weapons', () => {
		// Sample many seeds to trigger the rare T3 path
		let sawT3 = false;
		for (let i = 0; i < 50; i++) {
			const drop = pickWeaponDrop(`seed-${i}`, 16, 'squad');
			if (drop?.tier === 'T3') {
				sawT3 = true;
				break;
			}
		}
		expect(sawT3).toBe(true);
	});

	it('deterministic: same (seed, floor, tier) returns same drop', () => {
		const a = pickWeaponDrop('seed-X', 7, 'hitman');
		const b = pickWeaponDrop('seed-X', 7, 'hitman');
		expect(a).toEqual(b);
	});

	it('returns null when the random roll exceeds the per-tier drop rate', () => {
		// At least one of 100 seeds at low tier should yield null (drop rate ~0.3)
		let sawNull = false;
		for (let i = 0; i < 100; i++) {
			if (!pickWeaponDrop(`null-test-${i}`, 1, 'low')) { sawNull = true; break; }
		}
		expect(sawNull).toBe(true);
	});
});
