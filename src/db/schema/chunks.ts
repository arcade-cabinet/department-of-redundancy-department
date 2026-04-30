import { sql } from 'drizzle-orm';
import { blob, integer, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core';

/**
 * Persisted chunks. Per spec §8.1: ONLY modified chunks land here —
 * pristine chunks regenerate deterministically from `(world_meta.seed,
 * floor)` per the floor generator (PRQ-03). This keeps the save file
 * tiny: typical run touches ~5–20 chunks per floor in alpha gameplay.
 *
 * `dirty_blob` is the chunk's Uint16Array buffer (16³ * 2 = 8192 bytes)
 * stored as a SQLite BLOB. The runtime adapter is responsible for
 * isolating the read buffer before handing it to ChunkData.fromBuffer
 * (which asserts isolation — see src/world/chunk/ChunkData.ts).
 *
 * Composite PK on `(floor, chunk_x, chunk_z)` so upsert-on-dirty is
 * the natural write pattern.
 */
export const chunks = sqliteTable(
	'chunks',
	{
		floor: integer('floor').notNull(),
		chunkX: integer('chunk_x').notNull(),
		chunkZ: integer('chunk_z').notNull(),
		dirtyBlob: blob('dirty_blob', { mode: 'buffer' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => [primaryKey({ columns: [t.floor, t.chunkX, t.chunkZ] })],
);

export type ChunkRow = typeof chunks.$inferSelect;
export type ChunkInsert = typeof chunks.$inferInsert;
