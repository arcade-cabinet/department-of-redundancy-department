import { eq, sql } from 'drizzle-orm';
import { type WorldMetaRow, worldMeta } from '../schema/world';
import type { Db } from './types';

/** Read the singleton world_meta row. Returns null on a fresh DB before
 *  any seed has been set (the migrator's INSERT-OR-IGNORE creates the
 *  row with seed=''; treat empty seed as "not yet initialized"). */
export async function get(db: Db): Promise<WorldMetaRow | null> {
	const rows = await db.select().from(worldMeta).where(eq(worldMeta.id, 1)).limit(1);
	const row = rows[0];
	if (!row) return null;
	return row.seed === '' ? null : row;
}

/** Initialize world_meta on first new-game. Idempotent: if a row with
 *  the same id exists with a non-empty seed, this is a no-op (caller
 *  should `get()` first). */
export async function initFresh(db: Db, seed: string): Promise<void> {
	await db
		.insert(worldMeta)
		.values({ id: 1, seed })
		.onConflictDoUpdate({
			target: worldMeta.id,
			set: { seed, updatedAt: new Date() },
		});
}

/** Bump the floor index. The save loop calls this when the player
 *  takes the Up-Door / Down-Door (PRQ-12). */
export async function setCurrentFloor(db: Db, floor: number): Promise<void> {
	await db
		.update(worldMeta)
		.set({ currentFloor: floor, updatedAt: new Date() })
		.where(eq(worldMeta.id, 1));
}

/** Update threat scalar (spec §10). */
export async function setThreat(db: Db, threat: number): Promise<void> {
	await db.update(worldMeta).set({ threat, updatedAt: new Date() }).where(eq(worldMeta.id, 1));
}

/** Increment the lifetime kill counter. */
export async function incrementKills(db: Db, n = 1): Promise<void> {
	await db
		.update(worldMeta)
		.set({ kills: sql`${worldMeta.kills} + ${n}`, updatedAt: new Date() })
		.where(eq(worldMeta.id, 1));
}

/** Increment lifetime deaths. */
export async function incrementDeaths(db: Db, n = 1): Promise<void> {
	await db
		.update(worldMeta)
		.set({ deaths: sql`${worldMeta.deaths} + ${n}`, updatedAt: new Date() })
		.where(eq(worldMeta.id, 1));
}

/** Add elapsed gameplay seconds (called from the save loop tick). */
export async function addPlayedSeconds(db: Db, seconds: number): Promise<void> {
	await db
		.update(worldMeta)
		.set({
			playedSeconds: sql`${worldMeta.playedSeconds} + ${seconds}`,
			updatedAt: new Date(),
		})
		.where(eq(worldMeta.id, 1));
}
