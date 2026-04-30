import { eq, sql } from 'drizzle-orm';
import { type KillRow, kills } from '../schema/kills';
import type { Db } from './types';

/** Bump per-enemy kill counter. Creates the row on first kill. */
export async function increment(db: Db, slug: string, n = 1): Promise<void> {
	await db
		.insert(kills)
		.values({ slug, count: n })
		.onConflictDoUpdate({
			target: kills.slug,
			set: { count: sql`${kills.count} + ${n}`, lastAt: new Date() },
		});
}

export async function get(db: Db, slug: string): Promise<KillRow | null> {
	const rows = await db.select().from(kills).where(eq(kills.slug, slug)).limit(1);
	return rows[0] ?? null;
}

export async function list(db: Db): Promise<KillRow[]> {
	return db.select().from(kills);
}
