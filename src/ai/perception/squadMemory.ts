import { Vector3 } from 'yuka';
import { freshMemory, type MemoryRecord } from './Vision';

/**
 * Per-squad shared memory. A SWAT squad spawned by the director with
 * the same `squad` id reads + writes a single MemoryRecord here so
 * one squadmate seeing the player tags the player as visible to the
 * whole squad next tick.
 *
 * The registry is a plain Map keyed on squad id, with an idle-cleanup
 * step the runtime calls when a squad fully despawns. No persistence —
 * squad memory is per-floor, per-session.
 */

export class SquadMemoryRegistry {
	private memories = new Map<string, MemoryRecord>();
	private memberCounts = new Map<string, number>();

	/** Register a member joining the squad. Caller responsible for
	 *  matching `unregister` on despawn. */
	register(squadId: string): void {
		const n = (this.memberCounts.get(squadId) ?? 0) + 1;
		this.memberCounts.set(squadId, n);
		if (!this.memories.has(squadId)) {
			this.memories.set(squadId, freshMemory());
		}
	}

	unregister(squadId: string): void {
		const n = (this.memberCounts.get(squadId) ?? 1) - 1;
		if (n <= 0) {
			this.memberCounts.delete(squadId);
			this.memories.delete(squadId);
		} else {
			this.memberCounts.set(squadId, n);
		}
	}

	/** Read the squad's current shared memory; returns a fresh
	 *  MemoryRecord if no member has registered yet (defensive). */
	get(squadId: string): MemoryRecord {
		const m = this.memories.get(squadId);
		if (m) return m;
		const fresh = freshMemory();
		this.memories.set(squadId, fresh);
		return fresh;
	}

	/** Update the squad's memory if the new sighting is more recent. */
	update(squadId: string, visible: boolean, now: number, targetPosition: Vector3): MemoryRecord {
		if (!visible) return this.get(squadId);
		const next: MemoryRecord = {
			lastSeenAt: now,
			lastSeenPosition: new Vector3(targetPosition.x, targetPosition.y, targetPosition.z),
		};
		this.memories.set(squadId, next);
		return next;
	}

	/** Test-only diagnostic. */
	memberCount(squadId: string): number {
		return this.memberCounts.get(squadId) ?? 0;
	}
}

/** Singleton — runtime instantiates one per Game session. */
export function createSquadRegistry(): SquadMemoryRegistry {
	return new SquadMemoryRegistry();
}
