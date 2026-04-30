import { eq, sql } from 'drizzle-orm';
import { type InventoryRow, inventory } from '../schema/inventory';
import type { Db } from './types';

/** Place an item stack into a slot, replacing whatever was there. */
export async function setSlot(db: Db, slot: number, itemSlug: string, qty = 1): Promise<void> {
	await db.insert(inventory).values({ slot, itemSlug, qty }).onConflictDoUpdate({
		target: inventory.slot,
		set: { itemSlug, qty },
	});
}

/** Empty a slot. */
export async function clearSlot(db: Db, slot: number): Promise<void> {
	await db.delete(inventory).where(eq(inventory.slot, slot));
}

/** Decrement qty in a slot; clears the slot if it reaches 0. Returns the
 *  remaining qty (0 if cleared, -1 if slot was empty). */
export async function consume(db: Db, slot: number, n = 1): Promise<number> {
	const [row] = await db
		.select({ itemSlug: inventory.itemSlug, qty: inventory.qty })
		.from(inventory)
		.where(eq(inventory.slot, slot))
		.limit(1);
	if (!row) return -1;
	const newQty = row.qty - n;
	if (newQty <= 0) {
		await db.delete(inventory).where(eq(inventory.slot, slot));
		return 0;
	}
	await db.update(inventory).set({ qty: newQty }).where(eq(inventory.slot, slot));
	return newQty;
}

/** Increment qty if the slot already holds the same itemSlug; otherwise
 *  the caller should pick a different slot. Returns true on success. */
export async function add(db: Db, slot: number, itemSlug: string, n = 1): Promise<boolean> {
	const [row] = await db
		.select({ itemSlug: inventory.itemSlug })
		.from(inventory)
		.where(eq(inventory.slot, slot))
		.limit(1);
	if (!row) {
		await setSlot(db, slot, itemSlug, n);
		return true;
	}
	if (row.itemSlug !== itemSlug) return false;
	await db
		.update(inventory)
		.set({ qty: sql`${inventory.qty} + ${n}` })
		.where(eq(inventory.slot, slot));
	return true;
}

/** All slots, ordered by slot index. */
export async function list(db: Db): Promise<InventoryRow[]> {
	return db.select().from(inventory).orderBy(inventory.slot);
}
