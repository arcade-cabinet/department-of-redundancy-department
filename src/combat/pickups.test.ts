import { describe, expect, it } from 'vitest';
import { freshEquipped, setSlot } from '@/ecs/components/Equipped';
import { applyDamage, freshHealth, PLAYER_MAX_HP } from '@/ecs/components/Health';
import {
	applyPickup,
	BINDER_CLIPS_AMMO,
	BRIEFCASE_ARMOR,
	COFFEE_HEAL,
	DONUT_CAP_BUMP,
	DONUT_OVERHEAL,
	tickOverhealDecay,
} from './pickups';

function baseInput() {
	const eq = setSlot(freshEquipped(), 1, 'three-hole-punch', 10);
	return {
		health: freshHealth(PLAYER_MAX_HP),
		equipped: eq,
		armor: 0,
		overhealCap: PLAYER_MAX_HP,
	};
}

describe('pickups', () => {
	it('binder-clips adds +5 ammo to three-hole-punch slot', () => {
		const r = applyPickup({ kind: 'binder-clips', ...baseInput() });
		expect(r.equipped.slots[1]?.ammo).toBe(10 + BINDER_CLIPS_AMMO);
		expect(r.consumed).toBe(true);
	});

	it('coffee heals up to max (no overheal)', () => {
		const dmg = applyDamage(freshHealth(PLAYER_MAX_HP), 30);
		const r = applyPickup({
			kind: 'coffee',
			health: dmg,
			equipped: freshEquipped(),
			armor: 0,
			overhealCap: PLAYER_MAX_HP,
		});
		expect(r.health.current).toBe(70 + COFFEE_HEAL);
	});

	it('coffee at full HP → no change in current', () => {
		const r = applyPickup({ kind: 'coffee', ...baseInput() });
		expect(r.health.current).toBe(PLAYER_MAX_HP);
	});

	it('donut bumps overheal cap by 20 (capped at 120) + adds 20 HP up to new cap', () => {
		const r = applyPickup({ kind: 'donut', ...baseInput() });
		expect(r.overhealCap).toBe(PLAYER_MAX_HP + DONUT_CAP_BUMP);
		expect(r.health.current).toBe(PLAYER_MAX_HP + DONUT_OVERHEAL);
	});

	it('donut at maximum overheal does not exceed 120', () => {
		const r1 = applyPickup({
			kind: 'donut',
			health: { current: 110, max: 100, damageFlashTimer: 0 },
			equipped: freshEquipped(),
			armor: 0,
			overhealCap: 110,
		});
		expect(r1.overhealCap).toBe(120);
		expect(r1.health.current).toBe(120);
		// Stack again — cap doesn't grow past 120.
		const r2 = applyPickup({
			kind: 'donut',
			health: r1.health,
			equipped: r1.equipped,
			armor: r1.armor,
			overhealCap: r1.overhealCap,
		});
		expect(r2.overhealCap).toBe(120);
	});

	it('briefcase adds +25 armor', () => {
		const r = applyPickup({ kind: 'briefcase', ...baseInput() });
		expect(r.armor).toBe(BRIEFCASE_ARMOR);
	});

	it('overheal cap decays toward max over time', () => {
		const high = { current: 120, max: 100, damageFlashTimer: 0 };
		const r1 = tickOverhealDecay(high, 120, 1000);
		expect(r1.overhealCap).toBe(119);
		// HP follows cap if cap drops below current.
		const r2 = tickOverhealDecay({ current: 118, max: 100, damageFlashTimer: 0 }, 117.5, 0);
		expect(r2.overhealCap).toBe(117.5);
		expect(r2.health.current).toBe(117.5);
	});

	it('overheal decay clamps at health.max', () => {
		const r = tickOverhealDecay({ current: 80, max: 100, damageFlashTimer: 0 }, 101, 60_000);
		expect(r.overhealCap).toBe(100);
	});
});
