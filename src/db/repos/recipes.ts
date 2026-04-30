import { eq } from 'drizzle-orm';
import { type RecipeKnownRow, recipesKnown } from '../schema/recipes';
import type { Db } from './types';

/** Mark a recipe as discovered. Idempotent. */
export async function discover(db: Db, slug: string): Promise<void> {
	await db.insert(recipesKnown).values({ slug }).onConflictDoNothing();
}

export async function isKnown(db: Db, slug: string): Promise<boolean> {
	const rows = await db
		.select({ slug: recipesKnown.slug })
		.from(recipesKnown)
		.where(eq(recipesKnown.slug, slug))
		.limit(1);
	return rows.length > 0;
}

export async function list(db: Db): Promise<RecipeKnownRow[]> {
	return db.select().from(recipesKnown);
}
