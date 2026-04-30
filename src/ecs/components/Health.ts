/**
 * Health component shape. Lives on the player and every enemy entity.
 * Pure data — no koota dependency at this file level so the type
 * round-trips cleanly through serialization (PRQ-04 persistence may
 * later snapshot per-floor enemy HP).
 *
 * The player's max HP is 100 per spec. Manager max HP is 30.
 */

export interface Health {
	current: number;
	max: number;
	/** Decrements toward 0 each tick when > 0. UI reads this for the
	 *  red-flash damage indicator. Spec §19.2: 200ms flash window. */
	damageFlashTimer: number;
}

export const PLAYER_MAX_HP = 100;
export const MANAGER_MAX_HP = 30;
export const DAMAGE_FLASH_MS = 200;

export function freshHealth(max: number): Health {
	return { current: max, max, damageFlashTimer: 0 };
}

/** Apply damage. Returns the new Health record (immutable update for
 *  predictable React + koota subscriptions). `current` floors at 0;
 *  `damageFlashTimer` resets to DAMAGE_FLASH_MS on every hit. */
export function applyDamage(h: Health, dmg: number): Health {
	if (dmg <= 0) return h;
	const next = Math.max(0, h.current - dmg);
	return { current: next, max: h.max, damageFlashTimer: DAMAGE_FLASH_MS };
}

/** Tick the flash timer. Caller passes elapsed ms. */
export function tickDamageFlash(h: Health, elapsedMs: number): Health {
	if (h.damageFlashTimer <= 0) return h;
	return { ...h, damageFlashTimer: Math.max(0, h.damageFlashTimer - elapsedMs) };
}

export function isDead(h: Health): boolean {
	return h.current <= 0;
}

export function fractionRemaining(h: Health): number {
	if (h.max <= 0) return 0;
	return Math.max(0, Math.min(1, h.current / h.max));
}
