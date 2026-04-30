import { eq } from 'drizzle-orm';
import { type WeaponOwnedRow, weaponsOwned } from '../schema/weapons';
import type { Db } from './types';
import { type Equipped, emptySlot } from '@/ecs/components/Equipped';

/** Unlock a weapon (idempotent on slug — replays don't reset unlockedAt
 *  unless ammo changes). */
export async function unlock(db: Db, slug: string, ammo = 0): Promise<void> {
	await db.insert(weaponsOwned).values({ slug, ammo }).onConflictDoNothing();
}

/** Set current ammo for a weapon (no-op if not yet unlocked). */
export async function setAmmo(db: Db, slug: string, ammo: number): Promise<void> {
	await db.update(weaponsOwned).set({ ammo }).where(eq(weaponsOwned.slug, slug));
}

export async function list(db: Db): Promise<WeaponOwnedRow[]> {
	return db.select().from(weaponsOwned);
}

export async function isUnlocked(db: Db, slug: string): Promise<boolean> {
	const rows = await db
		.select({ slug: weaponsOwned.slug })
		.from(weaponsOwned)
		.where(eq(weaponsOwned.slug, slug))
		.limit(1);
	return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Alpha-save migration helper
// ---------------------------------------------------------------------------

const ALPHA_RENAMES: Record<string, { slug: string; ammo: number } | null> = {
	stapler: { slug: 'staple-rifle', ammo: 30 },
	'three-hole-punch': { slug: 'expense-report-smg', ammo: 32 },
	'toner-cannon': { slug: 'toner-cannon', ammo: 4 }, // identity rename, still defaults to T1 ammoCap
	'fax-machine': { slug: 'compliance-incinerator', ammo: 50 },
	'letter-opener': null,
	'whiteboard-marker': null,
};

const NEW_SLUGS = new Set([
	'staple-rifle',
	'binder-blaster',
	'expense-report-smg',
	'toner-cannon',
	'compliance-incinerator',
	'severance-special',
]);

export function migrateAlphaWeaponSlugs(eq: Equipped): Equipped {
	const slots = eq.slots.map((slot) => {
		if (!slot.slug) return slot;
		// Already on the new schema — leave alone (preserves tier).
		if (NEW_SLUGS.has(slot.slug)) return slot;
		const target = ALPHA_RENAMES[slot.slug];
		if (target === null) return emptySlot(); // dropped
		if (!target) return slot; // unknown slug — leave as-is
		// Preserve ammo if the player had less than the new T1 cap;
		// otherwise default to the new cap.
		const ammo = slot.ammo === -1 ? target.ammo : Math.min(slot.ammo, target.ammo);
		return { slug: target.slug, ammo, lastFireAt: slot.lastFireAt, tier: 'T1' as const };
	});
	return { ...eq, slots };
}
