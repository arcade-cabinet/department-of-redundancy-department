import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Per-enemy-slug kill counter. Drives threat decay (spec §10) and
 * the end-of-run report. `slug` matches the enemy catalogue keys
 * (`middle-manager`, `policeman`, etc.); `last_at` lets us decay
 * threat with recency weighting.
 */
export const kills = sqliteTable('kills', {
	slug: text('slug').primaryKey(),
	count: integer('count').notNull().default(0),
	lastAt: integer('last_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});

export type KillRow = typeof kills.$inferSelect;
export type KillInsert = typeof kills.$inferInsert;
