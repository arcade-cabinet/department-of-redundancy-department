import { and, eq } from 'drizzle-orm';
import { type ClaimedWaterCoolerRow, claimedWaterCoolers } from '../schema/coolers';
import type { Db } from './types';

/** Mark a water-cooler at (floor,x,y,z) as claimed. Idempotent — second
 *  claim on the same cell updates the timestamp. */
export async function claim(db: Db, floor: number, x: number, y: number, z: number): Promise<void> {
	await db
		.insert(claimedWaterCoolers)
		.values({ floor, x, y, z })
		.onConflictDoUpdate({
			target: [
				claimedWaterCoolers.floor,
				claimedWaterCoolers.x,
				claimedWaterCoolers.y,
				claimedWaterCoolers.z,
			],
			set: { claimedAt: new Date() },
		});
}

/** True if (floor,x,y,z) is already claimed. */
export async function isClaimed(
	db: Db,
	floor: number,
	x: number,
	y: number,
	z: number,
): Promise<boolean> {
	const rows = await db
		.select({ floor: claimedWaterCoolers.floor })
		.from(claimedWaterCoolers)
		.where(
			and(
				eq(claimedWaterCoolers.floor, floor),
				eq(claimedWaterCoolers.x, x),
				eq(claimedWaterCoolers.y, y),
				eq(claimedWaterCoolers.z, z),
			),
		)
		.limit(1);
	return rows.length > 0;
}

/** All claimed coolers on a floor (lit-up render hint + threat math). */
export async function listForFloor(db: Db, floor: number): Promise<ClaimedWaterCoolerRow[]> {
	return db.select().from(claimedWaterCoolers).where(eq(claimedWaterCoolers.floor, floor));
}
