import { describe, expect, it } from 'vitest';
import {
	addAmmoTo,
	canFire,
	currentAmmo,
	currentWeaponSlug,
	decrementAmmo,
	freshEquipped,
	QUICKBAR_SIZE,
	recordFire,
	selectSlot,
	setSlot,
} from './Equipped';

describe('Equipped', () => {
	it('freshEquipped has 8 empty slots, current=0', () => {
		const e = freshEquipped();
		expect(e.slots.length).toBe(QUICKBAR_SIZE);
		expect(e.current).toBe(0);
		for (const s of e.slots) {
			expect(s.slug).toBeNull();
		}
	});

	it('setSlot writes a weapon at the given index', () => {
		const e = setSlot(freshEquipped(), 0, 'stapler', -1);
		expect(e.slots[0]?.slug).toBe('stapler');
		expect(e.slots[0]?.ammo).toBe(-1);
	});

	it('setSlot rejects OOB indices', () => {
		expect(() => setSlot(freshEquipped(), -1, 'x', 0)).toThrow();
		expect(() => setSlot(freshEquipped(), QUICKBAR_SIZE, 'x', 0)).toThrow();
	});

	it('selectSlot is a no-op on empty slot', () => {
		const e = freshEquipped();
		const r = selectSlot(e, 3);
		expect(r.current).toBe(0);
	});

	it('selectSlot updates current when slot has weapon', () => {
		const e = setSlot(freshEquipped(), 1, 'three-hole-punch', 25);
		const r = selectSlot(e, 1);
		expect(r.current).toBe(1);
		expect(currentWeaponSlug(r)).toBe('three-hole-punch');
		expect(currentAmmo(r)).toBe(25);
	});

	it('decrementAmmo subtracts from current slot; -1 unlimited is no-op', () => {
		let e = setSlot(freshEquipped(), 0, 'stapler', -1);
		e = decrementAmmo(e);
		expect(currentAmmo(e)).toBe(-1);

		let e2 = setSlot(freshEquipped(), 0, 'three-hole-punch', 5);
		e2 = decrementAmmo(e2, 2);
		expect(currentAmmo(e2)).toBe(3);
		e2 = decrementAmmo(e2, 99);
		expect(currentAmmo(e2)).toBe(0);
	});

	it('addAmmoTo finds the right slot by slug', () => {
		let e = setSlot(freshEquipped(), 0, 'stapler', -1);
		e = setSlot(e, 1, 'three-hole-punch', 10);
		const r = addAmmoTo(e, 'three-hole-punch', 5);
		expect(r.slots[1]?.ammo).toBe(15);
		// Unlimited stays unlimited.
		const r2 = addAmmoTo(e, 'stapler', 100);
		expect(r2.slots[0]?.ammo).toBe(-1);
	});

	it('canFire respects cooldown', () => {
		let e = setSlot(freshEquipped(), 0, 'three-hole-punch', 5);
		// Ready at t=0 (lastFireAt = -Inf).
		expect(canFire(e, 800, 0)).toBe(true);
		e = recordFire(e, 1.0);
		// 200ms later: still cooling.
		expect(canFire(e, 800, 1.2)).toBe(false);
		// 800ms later: ready.
		expect(canFire(e, 800, 1.8)).toBe(true);
	});

	it('canFire returns false on empty slot or zero ammo', () => {
		const empty = freshEquipped();
		expect(canFire(empty, 100, 5)).toBe(false);
		const dry = setSlot(freshEquipped(), 0, 'three-hole-punch', 0);
		expect(canFire(dry, 100, 5)).toBe(false);
	});
});
