import { describe, expect, it } from 'vitest';
import { freshEquipped, setSlot } from '@/ecs/components/Equipped';
import { migrateAlphaWeaponSlugs } from './weapons';

describe('migrateAlphaWeaponSlugs', () => {
	it('renames stapler → staple-rifle T1', () => {
		const eq = setSlot(freshEquipped(), 0, 'stapler', -1);
		const next = migrateAlphaWeaponSlugs(eq);
		expect(next.slots[0]?.slug).toBe('staple-rifle');
		expect(next.slots[0]?.tier).toBe('T1');
		expect(next.slots[0]?.ammo).toBe(30);
	});

	it('renames three-hole-punch → expense-report-smg T1', () => {
		const eq = setSlot(freshEquipped(), 1, 'three-hole-punch', 10);
		const next = migrateAlphaWeaponSlugs(eq);
		expect(next.slots[1]?.slug).toBe('expense-report-smg');
		expect(next.slots[1]?.tier).toBe('T1');
		// ammo preserved when the destination weapon has ammo
		expect(next.slots[1]?.ammo).toBe(10);
	});

	it('drops letter-opener and whiteboard-marker (no equivalent)', () => {
		let eq = setSlot(freshEquipped(), 0, 'letter-opener', -1);
		eq = setSlot(eq, 1, 'whiteboard-marker', -1);
		const next = migrateAlphaWeaponSlugs(eq);
		expect(next.slots[0]?.slug).toBeNull();
		expect(next.slots[1]?.slug).toBeNull();
	});

	it('preserves new-format slugs unchanged', () => {
		const eq = setSlot(freshEquipped(), 0, 'staple-rifle', 30, 'T2');
		const next = migrateAlphaWeaponSlugs(eq);
		expect(next.slots[0]?.slug).toBe('staple-rifle');
		expect(next.slots[0]?.tier).toBe('T2');
	});
});
