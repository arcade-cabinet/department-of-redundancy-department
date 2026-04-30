import { eq, sql } from 'drizzle-orm';
import {
	type PlacedStructureInsert,
	type PlacedStructureRow,
	placedStructures,
} from '../schema/structures';
import type { Db } from './types';

/** Place a new structure (auto-generated id). Returns the created row's id. */
export async function place(db: Db, entry: Omit<PlacedStructureInsert, 'id'>): Promise<number> {
	const [row] = await db
		.insert(placedStructures)
		.values(entry)
		.returning({ id: placedStructures.id });
	if (!row) throw new Error('placedStructures.place: insert returned no row');
	return row.id;
}

/** All structures on a given floor — used by the renderer to mount GLB props. */
export async function listForFloor(db: Db, floor: number): Promise<PlacedStructureRow[]> {
	return db.select().from(placedStructures).where(eq(placedStructures.floor, floor));
}

/** Apply damage to a structure. If hp drops <= 0 the row is removed (mined back).
 *
 * Implementation note: atomic in SQLite via `UPDATE ... SET hp = hp - ?
 * RETURNING hp` — the engine handles the read-modify-write inside one
 * statement so two concurrent damage() calls (which can interleave on
 * the native adapter where the proxy is async) cannot lose updates.
 * If the post-update hp is ≤ 0 we follow with a DELETE keyed on
 * `id AND hp ≤ 0` so the second writer's attempted delete is a no-op
 * if the row was already cleared. Code-reviewer feedback on PR #10. */
export async function damage(db: Db, id: number, dmg: number): Promise<{ destroyed: boolean }> {
	const updated = await db
		.update(placedStructures)
		.set({ hp: sql`${placedStructures.hp} - ${dmg}` })
		.where(eq(placedStructures.id, id))
		.returning({ hp: placedStructures.hp });
	const row = updated[0];
	if (!row) return { destroyed: false };
	if (row.hp <= 0) {
		// Delete only if hp is still ≤ 0 (idempotent under racing
		// damage() calls — the second one finds the row gone).
		await db.delete(placedStructures).where(eq(placedStructures.id, id));
		return { destroyed: true };
	}
	return { destroyed: false };
}

/** Force-remove a structure (admin / cheat). */
export async function remove(db: Db, id: number): Promise<void> {
	await db.delete(placedStructures).where(eq(placedStructures.id, id));
}
