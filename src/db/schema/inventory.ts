import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Player inventory: one row per slot. Slot 0 is the primary hand,
 * higher slots are the satchel (size determined by player progress
 * per spec §11). `item_slug` references the static item catalogue
 * loaded from `public/content/items.json`; `qty` is stack size.
 *
 * Empty slots simply have no row.
 */
export const inventory = sqliteTable('inventory', {
	slot: integer('slot').primaryKey(),
	itemSlug: text('item_slug').notNull(),
	qty: integer('qty').notNull().default(1),
});

export type InventoryRow = typeof inventory.$inferSelect;
export type InventoryInsert = typeof inventory.$inferInsert;
