import { eq } from 'drizzle-orm';
import { type WeaponOwnedRow, weaponsOwned } from '../schema/weapons';
import type { Db } from './types';

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
