import { eq } from 'drizzle-orm';
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

/** Apply damage to a structure. If hp drops <= 0 the row is removed (mined back). */
export async function damage(db: Db, id: number, dmg: number): Promise<{ destroyed: boolean }> {
	const [row] = await db
		.select({ hp: placedStructures.hp })
		.from(placedStructures)
		.where(eq(placedStructures.id, id))
		.limit(1);
	if (!row) return { destroyed: false };
	const newHp = row.hp - dmg;
	if (newHp <= 0) {
		await db.delete(placedStructures).where(eq(placedStructures.id, id));
		return { destroyed: true };
	}
	await db.update(placedStructures).set({ hp: newHp }).where(eq(placedStructures.id, id));
	return { destroyed: false };
}

/** Force-remove a structure (admin / cheat). */
export async function remove(db: Db, id: number): Promise<void> {
	await db.delete(placedStructures).where(eq(placedStructures.id, id));
}
