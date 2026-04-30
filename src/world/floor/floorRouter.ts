/**
 * Pure router that decides whether a tap landed on a stairwell door
 * and which direction it would transition. The R3F runtime computes
 * `tapWorld` via camera→pointer raycast against the chunk geometry,
 * passes the door coords from generateFloor, and gets back either
 * 'up' / 'down' / null. Null means the tap was a regular movement tap
 * and should fall through to PlayerKinematic.
 *
 * Why a pure function: this is the contract surface between input and
 * floor-swap. Wiring it through R3F directly bakes in a `useRef`
 * lookup that can't be unit-tested. Pure-data + a thin R3F wrapper
 * (Door.tsx) keeps the logic covered without a browser.
 *
 * Voxel coords (DoorCoord) are converted to world coords by the
 * caller (Game.tsx already owns the VOXEL_SIZE / origin constants).
 * `tapWorld` and `playerPos` are both in world units.
 */

export interface Vec3World {
	x: number;
	y: number;
	z: number;
}

export interface DoorRouterCtx {
	upDoor: Vec3World;
	downDoor: Vec3World;
	currentFloor: number;
	playerPos: Vec3World;
	tapWorld: Vec3World;
	/** Max world-units between the tap point and a door for it to count
	 *  as a door tap. PRQ-12 spec doesn't pin this; 1.5u keeps a
	 *  generous-but-not-greedy radius around the door voxel. */
	tapMaxDistance: number;
	/** Max world-units between the player and a door for it to count
	 *  as accessible. Spec §4: doors must be reachable; we gate on
	 *  proximity so taps from across the floor don't fast-travel. */
	playerMaxDistance: number;
}

export type TapDirection = 'up' | 'down' | null;

export function routeTap(ctx: DoorRouterCtx): TapDirection {
	const upDist = dist(ctx.tapWorld, ctx.upDoor);
	const downDist = dist(ctx.tapWorld, ctx.downDoor);

	const upCandidate =
		upDist <= ctx.tapMaxDistance && dist(ctx.playerPos, ctx.upDoor) <= ctx.playerMaxDistance;
	const downCandidate =
		ctx.currentFloor > 1 &&
		downDist <= ctx.tapMaxDistance &&
		dist(ctx.playerPos, ctx.downDoor) <= ctx.playerMaxDistance;

	if (upCandidate && downCandidate) {
		// Tie-break by player→door distance, not tap→door. Spec §4
		// frames doors as "reachable", and the closer-to-player door is
		// more reachable when both are within the tap radius.
		const upPlayerDist = dist(ctx.playerPos, ctx.upDoor);
		const downPlayerDist = dist(ctx.playerPos, ctx.downDoor);
		return upPlayerDist <= downPlayerDist ? 'up' : 'down';
	}
	if (upCandidate) return 'up';
	if (downCandidate) return 'down';
	return null;
}

function dist(a: Vec3World, b: Vec3World): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Note: voxel→world conversion lives in useFloorState.doorToWorld.
// Was duplicated here in M1c1; collapsed in fold-forward.
