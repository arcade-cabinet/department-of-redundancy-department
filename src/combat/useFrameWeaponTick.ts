import { type MutableRefObject, useEffect, useRef } from 'react';
import type { EnemyHandle } from '@/ai/enemies/MiddleManagerEntity';
import type { Weapon } from '@/content/weapons';
import {
	canFire,
	currentAmmo,
	currentWeaponSlug,
	decrementAmmo,
	type Equipped,
} from '@/ecs/components/Equipped';
import { type AutoEngageState, clearEngageTarget, tickAutoEngage } from './autoEngage';
import { applyZoneMultiplier, classifyHitZone } from './damageZones';

/**
 * Driver hook (PRQ-09 + M4 wiring) that runs the player's auto-engage
 * + weapon firing loop on a setInterval (16ms ≈ 60Hz). Game.tsx calls
 * this once with refs; the hook owns the cadence math.
 *
 * Each tick:
 *   1. Pull the locked target from the registry; if absent or dead,
 *      clear the engage state.
 *   2. Compute LOS + range; if both true and the weapon's cooldown has
 *      elapsed, fire.
 *   3. Firing applies damage to the target (with damage-zone bonus
 *      based on target capsule local-y). For projectile weapons the
 *      runtime would also spawn a Projectile; alpha shortcut is to
 *      apply damage immediately and spawn a visual.
 */

export interface WeaponTickInput {
	paused: boolean;
	engageState: AutoEngageState;
	setEngageState: (s: AutoEngageState) => void;
	enemyRegistry: Map<string, EnemyHandle>;
	getPlayerPosition: () => { x: number; y: number; z: number };
	equipped: Equipped;
	setEquipped: (eq: Equipped) => void;
	weapons: Map<string, Weapon> | null;
	lastFireAtRef: MutableRefObject<number>;
}

export function useFrameWeaponTick(input: WeaponTickInput): void {
	// Use refs to keep the interval callback stable while Game.tsx
	// re-renders. Each tick reads the latest state via the ref.
	const inputRef = useRef(input);
	inputRef.current = input;

	useEffect(() => {
		const id = setInterval(() => {
			const cur = inputRef.current;
			if (cur.paused) return;
			const state = cur.engageState;
			if (state.targetId === null) return;
			const enemy = cur.enemyRegistry.get(state.targetId);
			if (!enemy || !enemy.isAlive()) {
				cur.setEngageState(clearEngageTarget(state));
				return;
			}
			const slug = currentWeaponSlug(cur.equipped);
			if (!slug) return;
			const weapon = cur.weapons?.get(slug);
			if (!weapon) return;
			const playerPos = cur.getPlayerPosition();
			const enemyPos = enemy.getPosition();
			const dx = enemyPos.x - playerPos.x;
			const dz = enemyPos.z - playerPos.z;
			const dist = Math.hypot(dx, dz);
			const range = weapon.kind === 'melee' ? weapon.range : weapon.range;
			const inRange = dist <= range;
			const now = performance.now() / 1000;
			const ready =
				canFire(cur.equipped, weapon.cooldownMs, now * 1000) &&
				now * 1000 - cur.lastFireAtRef.current * 1000 >= weapon.cooldownMs;
			const tick = tickAutoEngage({
				state,
				now,
				targetAlive: enemy.isAlive(),
				targetVisible: true, // LOS-via-BVH lands when raycasts wire; alpha = always-true
				targetInRange: inRange,
				weaponReady: ready,
			});
			if (tick.action.clear) {
				cur.setEngageState(tick.state);
				return;
			}
			if (tick.action.fire) {
				cur.lastFireAtRef.current = now;
				// Pick a random local-y in the capsule (simplified — alpha
				// uses zone-weighted RNG; full BVH raycast lands later).
				const zoneRoll = Math.random();
				const zone = zoneRoll < 0.15 ? 'head' : zoneRoll < 0.6 ? 'torso' : 'limbs';
				const baseDmg = weapon.damage;
				const finalDmg = applyZoneMultiplier(baseDmg, zone);
				enemy.damage(finalDmg);
				if (weapon.kind !== 'melee') {
					cur.setEquipped(decrementAmmo(cur.equipped, 1));
				}
				if (cur.equipped && currentAmmo(cur.equipped) === 0 && weapon.kind !== 'melee') {
					cur.setEngageState(clearEngageTarget(tick.state));
				}
				// Suppress unused-import warning while LOS is stub.
				void classifyHitZone;
			}
		}, 16);
		return () => clearInterval(id);
	}, []);
}
