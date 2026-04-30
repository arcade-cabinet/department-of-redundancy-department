/**
 * Equipped-weapon slot. Spec §0 calls for an 8-slot quickbar; alpha
 * uses slots 0 (stapler) and 1 (three-hole-punch). Number keys 1–8 on
 * desktop and tap-icon on mobile switch slots.
 *
 * The component owns the per-slot weapon slug + per-slot ammo count.
 * Weapon stats (damage, cooldown, etc.) are looked up via the weapons
 * table — slugs are the join key. Ammo is per-slot so picking up a
 * Three-Hole Punch refill while the stapler is equipped still credits
 * the right slot.
 *
 * `lastFireAt` is in game seconds; the cooldown gate is
 * `now - lastFireAt >= cooldownMs/1000`.
 */

export type Tier = 'T1' | 'T2' | 'T3';

export interface EquippedSlot {
	slug: string | null;
	ammo: number; // -1 = unlimited (melee weapons)
	lastFireAt: number; // -Infinity = never fired
	tier: Tier;
}

export interface Equipped {
	slots: EquippedSlot[];
	current: number;
}

export const QUICKBAR_SIZE = 8;

export function freshEquipped(): Equipped {
	return {
		slots: Array.from({ length: QUICKBAR_SIZE }, () => emptySlot()),
		current: 0,
	};
}

export function emptySlot(): EquippedSlot {
	return { slug: null, ammo: 0, lastFireAt: -Infinity, tier: 'T1' };
}

export function setSlot(eq: Equipped, idx: number, slug: string, ammo: number, tier: Tier = 'T1'): Equipped {
	if (idx < 0 || idx >= QUICKBAR_SIZE) throw new RangeError(`slot index ${idx} OOB`);
	const slots = eq.slots.slice();
	slots[idx] = { slug, ammo, lastFireAt: -Infinity, tier };
	return { ...eq, slots };
}

export function setSlotTier(eq: Equipped, idx: number, tier: Tier): Equipped {
	if (idx < 0 || idx >= QUICKBAR_SIZE) return eq;
	const slot = eq.slots[idx];
	if (!slot?.slug) return eq;
	const slots = eq.slots.slice();
	slots[idx] = { ...slot, tier };
	return { ...eq, slots };
}

export function currentTier(eq: Equipped): Tier {
	return eq.slots[eq.current]?.tier ?? 'T1';
}

export function selectSlot(eq: Equipped, idx: number): Equipped {
	if (idx < 0 || idx >= QUICKBAR_SIZE) return eq;
	if (!eq.slots[idx]?.slug) return eq; // can't select empty
	return { ...eq, current: idx };
}

export function currentWeaponSlug(eq: Equipped): string | null {
	return eq.slots[eq.current]?.slug ?? null;
}

export function currentAmmo(eq: Equipped): number {
	return eq.slots[eq.current]?.ammo ?? 0;
}

export function decrementAmmo(eq: Equipped, n = 1): Equipped {
	const slots = eq.slots.slice();
	const cur = slots[eq.current];
	if (!cur || cur.ammo === -1) return eq; // unlimited (melee)
	slots[eq.current] = { ...cur, ammo: Math.max(0, cur.ammo - n) };
	return { ...eq, slots };
}

export function addAmmoTo(eq: Equipped, slug: string, n: number): Equipped {
	const slots = eq.slots.slice();
	let mutated = false;
	for (let i = 0; i < slots.length; i++) {
		const s = slots[i];
		if (s?.slug === slug && s.ammo !== -1) {
			slots[i] = { ...s, ammo: s.ammo + n };
			mutated = true;
		}
	}
	return mutated ? { ...eq, slots } : eq;
}

export function recordFire(eq: Equipped, now: number): Equipped {
	const slots = eq.slots.slice();
	const cur = slots[eq.current];
	if (!cur) return eq;
	slots[eq.current] = { ...cur, lastFireAt: now };
	return { ...eq, slots };
}

export function canFire(eq: Equipped, cooldownMs: number, now: number): boolean {
	const cur = eq.slots[eq.current];
	if (!cur?.slug) return false;
	if (cur.ammo === 0) return false;
	const elapsed = now - cur.lastFireAt;
	return elapsed * 1000 >= cooldownMs;
}
