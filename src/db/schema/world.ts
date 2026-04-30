import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Single-row table holding the world's persistent metadata. The row is
 * created on first boot (id=1) and updated in place. Spec §8.1.
 */
export const worldMeta = sqliteTable('world_meta', {
	id: integer('id').primaryKey().default(1),
	seed: text('seed').notNull(),
	currentFloor: integer('current_floor').notNull().default(1),
	threat: real('threat').notNull().default(0),
	deaths: integer('deaths').notNull().default(0),
	kills: integer('kills').notNull().default(0),
	playedSeconds: integer('played_seconds').notNull().default(0),
	schemaVersion: integer('schema_version').notNull().default(1),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
});

export type WorldMetaRow = typeof worldMeta.$inferSelect;
export type WorldMetaInsert = typeof worldMeta.$inferInsert;
