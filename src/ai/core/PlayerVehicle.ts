import { FollowPathBehavior, type NavMesh, Path, Vector3, Vehicle } from 'yuka';

/**
 * Yuka Vehicle wrapper for the player's path-follower. Used ONLY for
 * tap-to-travel; manual-input (WASD on desktop, drag-look on mobile)
 * bypasses the vehicle and drives the kinematic controller directly.
 *
 * Why a Vehicle at all? It's the cleanest reuse of yuka's
 * `FollowPathBehavior` — same machinery enemy vehicles will use in
 * PRQ-08+, and it returns smooth velocity vectors per tick so the
 * Rapier kinematic move is a one-liner.
 *
 * The Vehicle's position is kept in sync with the Rapier kinematic
 * controller's translation each frame: PlayerVehicle.sync(pos) before
 * tick, PlayerVehicle.tick(dt) → consume the resulting velocity.
 *
 * Why not let yuka own position: Rapier owns ground/wall collision.
 * Yuka tells us where to GO; Rapier tells us where we CAN go. Sync
 * keeps the two in lockstep without yuka's predicted-pos drifting
 * past a wall.
 */

export interface PlayerVehicleHandle {
	/** Set a new path; pre-empts any in-flight follow. */
	setPath(waypoints: Vector3[]): void;
	/** Find a path on the navmesh and follow it. */
	pathTo(navMesh: NavMesh, target: Vector3): boolean;
	/** Cancel the current path (e.g. WASD override). */
	clearPath(): void;
	/** Has a non-empty path remaining. */
	readonly hasPath: boolean;
	/** Sync the vehicle's position to the kinematic controller's pose. */
	sync(position: Vector3): void;
	/** Step the vehicle forward; returns velocity vector to apply. */
	tick(dt: number): Vector3;
	/** Underlying yuka Vehicle (for debug/visualization access). */
	readonly vehicle: Vehicle;
	/** True if the vehicle has reached the final waypoint (within
	 *  FollowPathBehavior's nextWaypointDistance threshold). */
	readonly arrived: boolean;
}

export interface PlayerVehicleOptions {
	/** Linear speed in world-units/sec. Default 4 (matches voxelSize 0.4 ×
	 *  10 voxels/sec walking pace). */
	maxSpeed?: number;
	/** Distance under which a waypoint is "reached" and the follower
	 *  advances. Default 0.4 (one voxel). */
	nextWaypointDistance?: number;
}

const SCRATCH_VELOCITY = new Vector3();

export function createPlayerVehicle(opts: PlayerVehicleOptions = {}): PlayerVehicleHandle {
	const vehicle = new Vehicle();
	vehicle.maxSpeed = opts.maxSpeed ?? 4;
	vehicle.maxForce = vehicle.maxSpeed * 4;
	// Smaller boundingRadius: the player kinematic uses Rapier capsule
	// collision; yuka's bounding only matters for inter-vehicle steering
	// which the player doesn't do.
	vehicle.boundingRadius = 0.3;

	const follow = new FollowPathBehavior();
	follow.nextWaypointDistance = opts.nextWaypointDistance ?? 0.4;
	follow.path = new Path();
	follow.active = false;
	vehicle.steering.add(follow);

	const setPath = (waypoints: Vector3[]): void => {
		const path = new Path();
		// Note: we don't loop the path — players don't pace.
		path.loop = false;
		for (const w of waypoints) path.add(w);
		follow.path = path;
		follow.active = waypoints.length > 0;
	};

	const handle: PlayerVehicleHandle = {
		vehicle,
		setPath,
		pathTo(navMesh, target) {
			// Yuka's findPath always returns at least [start, end] even when
			// the navmesh is empty or the target is outside walkable
			// territory (it falls back to a straight line). Guard at the
			// region boundary: if either endpoint isn't in any nav region,
			// treat as unreachable.
			if (!navMesh.getClosestRegion(vehicle.position) || !navMesh.getClosestRegion(target)) {
				follow.active = false;
				return false;
			}
			const points = navMesh.findPath(vehicle.position, target);
			if (!points || points.length === 0) {
				follow.active = false;
				return false;
			}
			setPath(points);
			return true;
		},
		clearPath() {
			follow.active = false;
			follow.path = new Path();
		},
		get hasPath() {
			return (
				follow.active && (follow.path as Path & { _waypoints: Vector3[] })._waypoints.length > 0
			);
		},
		sync(position) {
			vehicle.position.copy(position);
		},
		tick(dt) {
			if (!follow.active) return SCRATCH_VELOCITY.set(0, 0, 0);
			vehicle.update(dt);
			return SCRATCH_VELOCITY.copy(vehicle.velocity);
		},
		get arrived() {
			if (!follow.path) return true;
			const wps = (follow.path as Path & { _waypoints: Vector3[] })._waypoints;
			if (wps.length === 0) return true;
			const last = wps[wps.length - 1];
			if (!last) return true;
			return vehicle.position.squaredDistanceTo(last) < follow.nextWaypointDistance ** 2;
		},
	};
	return handle;
}
