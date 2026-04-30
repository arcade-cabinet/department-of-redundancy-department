import { desc, eq } from 'drizzle-orm';
import { type JournalEntryInsert, type JournalEntryRow, journalEntries } from '../schema/journal';
import type { Db } from './types';

/** Append a journal event. Body is freeform JSON-encoded by the caller. */
export async function append(db: Db, entry: Omit<JournalEntryInsert, 'id'>): Promise<number> {
	const [row] = await db.insert(journalEntries).values(entry).returning({ id: journalEntries.id });
	if (!row) throw new Error('journal.append: insert returned no row');
	return row.id;
}

/** Recent entries on a floor (newest first), capped to `limit`. */
export async function listForFloor(db: Db, floor: number, limit = 100): Promise<JournalEntryRow[]> {
	return db
		.select()
		.from(journalEntries)
		.where(eq(journalEntries.floor, floor))
		.orderBy(desc(journalEntries.ts))
		.limit(limit);
}

/** Recent entries across all floors — used by the end-of-run report. */
export async function listAll(db: Db, limit = 500): Promise<JournalEntryRow[]> {
	return db.select().from(journalEntries).orderBy(desc(journalEntries.ts)).limit(limit);
}
