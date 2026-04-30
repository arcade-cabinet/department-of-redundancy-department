import { sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core';

/**
 * Claimed water-cooler positions per floor. Once claimed, a cooler
 * stops respawning enemies in the surrounding cubicle bank (spec §10
 * threat system). Composite PK on `(floor, x, y, z)` — there's at
 * most one claim per cell.
 */
export const claimedWaterCoolers = sqliteTable(
	'claimed_water_coolers',
	{
		floor: integer('floor').notNull(),
		x: integer('x').notNull(),
		y: integer('y').notNull(),
		z: integer('z').notNull(),
		claimedAt: integer('claimed_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => [primaryKey({ columns: [t.floor, t.x, t.y, t.z] })],
);

export type ClaimedWaterCoolerRow = typeof claimedWaterCoolers.$inferSelect;
export type ClaimedWaterCoolerInsert = typeof claimedWaterCoolers.$inferInsert;
