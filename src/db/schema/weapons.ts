import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Weapons unlocked by the player. `slug` is the weapon catalogue key
 * (e.g. `staple-cannon`, `letter-opener`). `ammo` is current magazine
 * count for ammo-using weapons; melee weapons leave it at the default
 * sentinel.
 */
export const weaponsOwned = sqliteTable('weapons_owned', {
	slug: text('slug').primaryKey(),
	ammo: integer('ammo').notNull().default(0),
	unlockedAt: integer('unlocked_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
});

export type WeaponOwnedRow = typeof weaponsOwned.$inferSelect;
export type WeaponOwnedInsert = typeof weaponsOwned.$inferInsert;
