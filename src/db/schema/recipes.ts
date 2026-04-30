import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Recipes discovered by the player. Discovery is a beta feature
 * (PRQ-B1) but the table lands in alpha so we don't fork the schema
 * mid-version. `slug` references entries in
 * `public/content/recipes.json`.
 */
export const recipesKnown = sqliteTable('recipes_known', {
	slug: text('slug').primaryKey(),
	discoveredAt: integer('discovered_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
});

export type RecipeKnownRow = typeof recipesKnown.$inferSelect;
export type RecipeKnownInsert = typeof recipesKnown.$inferInsert;
