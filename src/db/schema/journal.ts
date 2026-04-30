import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Append-only run journal. Each row is one event the narrator may
 * surface in a memo, end-of-run report, or dynamic dialogue. `kind`
 * is a small enum string (`death`, `kill`, `floor-clear`, `cooler-claim`,
 * `recipe-discover`, `boss-defeat`); `body` is freeform JSON-encoded
 * details (slug references, counts, locations) the renderer parses
 * for display.
 */
export const journalEntries = sqliteTable('journal_entries', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	floor: integer('floor').notNull(),
	ts: integer('ts', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
	kind: text('kind').notNull(),
	body: text('body').notNull(),
});

export type JournalEntryRow = typeof journalEntries.$inferSelect;
export type JournalEntryInsert = typeof journalEntries.$inferInsert;
