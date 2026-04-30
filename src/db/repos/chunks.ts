import { and, eq } from 'drizzle-orm';
import { type ChunkRow, chunks } from '../schema/chunks';
import type { Db } from './types';

/** Persist (or update) a dirty chunk's blob for a given (floor, x, z). */
export async function upsert(
	db: Db,
	floor: number,
	chunkX: number,
	chunkZ: number,
	blob: Uint8Array,
): Promise<void> {
	const buf = Buffer.from(blob.buffer, blob.byteOffset, blob.byteLength);
	await db
		.insert(chunks)
		.values({ floor, chunkX, chunkZ, dirtyBlob: buf })
		.onConflictDoUpdate({
			target: [chunks.floor, chunks.chunkX, chunks.chunkZ],
			set: { dirtyBlob: buf, updatedAt: new Date() },
		});
}

/** Load every persisted chunk on a floor. Pristine chunks (never
 *  modified) are absent here and regenerated on demand from the seed
 *  by the floor generator. */
export async function listForFloor(db: Db, floor: number): Promise<ChunkRow[]> {
	return db.select().from(chunks).where(eq(chunks.floor, floor));
}

/** Read one specific chunk's blob (returns null if pristine). */
export async function get(
	db: Db,
	floor: number,
	chunkX: number,
	chunkZ: number,
): Promise<ChunkRow | null> {
	const rows = await db
		.select()
		.from(chunks)
		.where(and(eq(chunks.floor, floor), eq(chunks.chunkX, chunkX), eq(chunks.chunkZ, chunkZ)))
		.limit(1);
	return rows[0] ?? null;
}

/** Drop persisted chunks on a floor (used by floor regeneration / cheat
 *  reset). Pristine chunks regenerate from seed regardless. */
export async function clearFloor(db: Db, floor: number): Promise<void> {
	await db.delete(chunks).where(eq(chunks.floor, floor));
}
