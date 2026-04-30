import type { Vec3World } from '@/world/floor/floorRouter';
import type { Rng } from '@/world/generator/rng';

/**
 * Reaper teleport target picker (PRQ-13 T2). Pure function: caller
 * supplies the walkable cell list (from PRQ-06 navmesh region centers
 * or generator floor tiles), the player position, and an RNG. Returns
 * a cell within `[REAPER_TELEPORT_MIN_DISTANCE, REAPER_TELEPORT_MAX_DISTANCE]`
 * units of the player, or null if no such cell exists.
 *
 * Why outside the FSM: the FSM is engine-agnostic; the navmesh is not
 * (yuka regions). Picking a cell needs the walkable list, which the
 * R3F runtime owns. Keeping the picker pure-data lets us unit-test it
 * against synthetic walkable grids.
 */

export const REAPER_TELEPORT_MIN_DISTANCE = 2;
export const REAPER_TELEPORT_MAX_DISTANCE = 8;

export function pickTeleportCell(
	walkable: readonly Vec3World[],
	playerPos: Vec3World,
	rng: Rng,
): Vec3World | null {
	const candidates: Vec3World[] = [];
	for (const c of walkable) {
		const dx = c.x - playerPos.x;
		const dz = c.z - playerPos.z;
		const d = Math.sqrt(dx * dx + dz * dz);
		if (d >= REAPER_TELEPORT_MIN_DISTANCE && d <= REAPER_TELEPORT_MAX_DISTANCE) {
			candidates.push(c);
		}
	}
	if (candidates.length === 0) return null;
	return rng.pick(candidates);
}
