import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Player-placed structures (placed-stair-block, placed-wall-block,
 * placed-desk-block, placed-terminal). These live OUTSIDE the chunk
 * blob because they're sparse — placing 4 structures shouldn't dirty
 * 4 whole chunks. The renderer mounts them as separate GLB props on
 * top of the voxel chunks.
 *
 * `slug` references BlockRegistry slug for placeable types; HP is
 * present so structures can be mined back later (spec §11 building +
 * mining).
 */
export const placedStructures = sqliteTable('placed_structures', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	floor: integer('floor').notNull(),
	slug: text('slug').notNull(),
	x: real('x').notNull(),
	y: real('y').notNull(),
	z: real('z').notNull(),
	rot: real('rot').notNull().default(0),
	hp: integer('hp').notNull().default(100),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
});

export type PlacedStructureRow = typeof placedStructures.$inferSelect;
export type PlacedStructureInsert = typeof placedStructures.$inferInsert;
