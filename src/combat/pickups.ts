/**
 * Pickup logic. Each pickup type has a single `apply(state)` function
 * the runtime calls when the player walks over OR taps the entity.
 *
 * Effects (spec §0):
 *   - binder-clips: +5 ammo to whichever projectile slot has matching slug
 *     (alpha: three-hole-punch).
 *   - coffee: +20 HP, capped at max.
 *   - donut: +20 overheal — temporary cap raised to 120, decays to max
 *     over 30s (decay handled in runtime tick, not here).
 *   - briefcase: +25 armor (alpha: not yet wired into damage math; the
 *     pickup is captured for future use).
 */

import { addAmmoTo, type Equipped } from '@/ecs/components/Equipped';
import { applyDamage as _markUnused, type Health } from '@/ecs/components/Health';

export type PickupKind = 'binder-clips' | 'coffee' | 'donut' | 'briefcase';

export interface PickupEffectInput {
	kind: PickupKind;
	health: Health;
	equipped: Equipped;
	armor: number;
	overhealCap: number;
}

export interface PickupEffectResult {
	health: Health;
	equipped: Equipped;
	armor: number;
	overhealCap: number;
	consumed: boolean;
}

export const COFFEE_HEAL = 20;
export const DONUT_OVERHEAL = 20;
export const DONUT_CAP_BUMP = 20;
export const BRIEFCASE_ARMOR = 25;
export const BINDER_CLIPS_AMMO = 5;
const DONUT_MAX_CAP = 120;

export function applyPickup(input: PickupEffectInput): PickupEffectResult {
	void _markUnused; // Health module also exports applyDamage; we don't use it here.
	const { kind, health, equipped, armor, overhealCap } = input;
	switch (kind) {
		case 'binder-clips':
			return {
				health,
				equipped: addAmmoTo(equipped, 'three-hole-punch', BINDER_CLIPS_AMMO),
				armor,
				overhealCap,
				consumed: true,
			};
		case 'coffee': {
			const cap = Math.max(health.max, overhealCap);
			const next = Math.min(cap, health.current + COFFEE_HEAL);
			return {
				health: { ...health, current: next },
				equipped,
				armor,
				overhealCap,
				consumed: true,
			};
		}
		case 'donut': {
			const newCap = Math.min(DONUT_MAX_CAP, overhealCap + DONUT_CAP_BUMP);
			const next = Math.min(newCap, health.current + DONUT_OVERHEAL);
			return {
				health: { ...health, current: next },
				equipped,
				armor,
				overhealCap: newCap,
				consumed: true,
			};
		}
		case 'briefcase':
			return {
				health,
				equipped,
				armor: armor + BRIEFCASE_ARMOR,
				overhealCap,
				consumed: true,
			};
	}
}

/**
 * Decay overheal cap back toward `health.max` over time. Called per
 * frame from the runtime; rate = 1 cap-point/sec (so the donut's +20
 * lasts ~20 seconds before fully decaying).
 */
export function tickOverhealDecay(
	health: Health,
	overhealCap: number,
	elapsedMs: number,
): { health: Health; overhealCap: number } {
	if (overhealCap <= health.max) return { health, overhealCap };
	const decay = elapsedMs / 1000; // 1u/sec
	const nextCap = Math.max(health.max, overhealCap - decay);
	const next = Math.min(nextCap, health.current);
	return {
		health: { ...health, current: next },
		overhealCap: nextCap,
	};
}
