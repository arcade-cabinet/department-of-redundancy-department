import { type DoorCoord, type FloorResult, generateFloor } from '@/world/generator/floor';

/**
 * Floor swap orchestrator (PRQ-12 T3). Pure of any framework / DB
 * binding: callers inject the side effects through `SwapDeps`. The
 * runtime wiring (PRQ-14) plugs in:
 *   - drizzle calls for getCurrentFloor / setCurrentFloor / persisted chunks,
 *   - PRQ-04 save loop for flushDirty,
 *   - PRQ-10 spawn director for respawnEnemies,
 *   - audio bus for emitArrival,
 *   - @capacitor/preferences for setLastFloor.
 *
 * Swap rules (spec §4 + §19.2):
 *   1. Flush dirty chunks (so what the player did on this floor persists).
 *   2. Bump current_floor (up = +1, down = -1; never below 1).
 *   3. Apply -0.5 threat decay (cooling-off effect of leaving the floor).
 *   4. Hand caller the persisted chunk blobs for the destination so it
 *      can restore them on top of the freshly generated baseline.
 *   5. Generate destination from `(seed, destFloor)` — pristine cells
 *      are recomputed; the caller overlays persisted ones.
 *   6. Re-run the spawn director.
 *   7. Mirror current_floor to last_floor (PRQ-12 T6).
 *   8. Emit floor-arrival event (PRQ-12 T5).
 *   9. Return the spawn coord = opposite door of the destination floor.
 *      Up-Door of N → arrive at Down-Door of N+1, and vice versa.
 */

export type SwapDirection = 'up' | 'down';

export interface PersistedChunk {
	floor: number;
	chunkX: number;
	chunkZ: number;
	dirtyBlob: Uint8Array;
}

export interface SwapDeps {
	getCurrentFloor(): Promise<number>;
	setCurrentFloor(floor: number): Promise<void>;
	flushDirty(): Promise<void>;
	listPersistedChunks(floor: number): Promise<PersistedChunk[]>;
	generate(seed: string, floor: number): FloorResult;
	applyThreatDecay(delta: number): Promise<void>;
	respawnEnemies(floor: number): Promise<void>;
	emitArrival(floor: number): void;
	setLastFloor(floor: number): Promise<void>;
	getSeed(): Promise<string>;
}

export interface SwapResult {
	destFloor: number;
	dest: FloorResult;
	persisted: PersistedChunk[];
	spawn: DoorCoord;
	threatDelta: number;
}

export const FLOOR_THREAT_DECAY = -0.5;

export async function swapFloor(direction: SwapDirection, deps: SwapDeps): Promise<SwapResult> {
	const current = await deps.getCurrentFloor();
	const destFloor = direction === 'up' ? current + 1 : current - 1;
	if (destFloor < 1) throw new Error('cannot descend below floor 1');

	await deps.flushDirty();
	await deps.setCurrentFloor(destFloor);
	await deps.applyThreatDecay(FLOOR_THREAT_DECAY);

	const seed = await deps.getSeed();
	const dest = deps.generate(seed, destFloor);
	const persisted = await deps.listPersistedChunks(destFloor);

	await deps.respawnEnemies(destFloor);
	await deps.setLastFloor(destFloor);
	deps.emitArrival(destFloor);

	const spawn = direction === 'up' ? dest.downDoor : dest.upDoor;

	return { destFloor, dest, persisted, spawn, threatDelta: FLOOR_THREAT_DECAY };
}

/** Default `generate` impl wired in tests + runtime. Re-exported so
 *  callers don't need a separate import. */
export { generateFloor };
