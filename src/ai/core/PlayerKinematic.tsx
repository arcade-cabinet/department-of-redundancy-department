import { useFrame, useThree } from '@react-three/fiber';
import { CapsuleCollider, type RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { type PerspectiveCamera, Plane, Raycaster, Vector3 as ThreeVector3, Vector2 } from 'three';
import { type NavMesh, Vector3 as YukaVector3 } from 'yuka';
import { type DesktopFallback, subscribeKeyboard } from '@/input/desktopFallback';
import { createPlayerVehicle, type PlayerVehicleHandle } from './PlayerVehicle';

type Props = {
	navMesh: NavMesh | null;
	/** Initial spawn point (xz). Y is auto-set to floorY. */
	spawn?: [number, number];
	/** Player capsule eye-height; camera tracks `bodyY + eyeHeight`. */
	eyeHeight?: number;
	/** Walkable plane Y for the screen→world raycast in tap-travel. */
	floorY?: number;
};

export type PlayerKinematicHandle = {
	tap(screenX: number, screenY: number): void;
	clear(): void;
	readonly path: readonly YukaVector3[];
};

const CAPSULE_HEIGHT = 1.0; // half-length of the cylindrical part
const CAPSULE_RADIUS = 0.3;
const WASD_SPEED = 4;
const COLLIDER_OFFSET = 0.05; // how far from a wall the controller stops

/**
 * Player character mounted as a Rapier kinematic-position body with a
 * capsule collider. Drives motion via a yuka.Vehicle when path-following
 * (tap-to-travel) and via WASD when the desktop fallback is active.
 *
 * Both inputs converge on the SAME setNextKinematicTranslation call —
 * we never write the camera position directly. The camera is parented
 * to the body's translation each frame, with eye-height offset.
 *
 * Why kinematicPosition (not dynamic): the player is the camera's
 * scaffolding. Dynamic bodies sleep, get pushed by other dynamics,
 * and respond to gravity in a way that fights with tap-to-travel's
 * deterministic path-follow. Kinematic = "game code owns position;
 * physics owns collision response."
 *
 * The Rapier `KinematicCharacterController` provides swept-collision
 * (capsule slides along walls instead of stopping dead). We compute
 * the desired delta from yuka or WASD, hand it to the controller,
 * read the corrected delta back, and apply it via translation.
 */
export const PlayerKinematic = forwardRef<PlayerKinematicHandle, Props>(function PlayerKinematic(
	{ navMesh, spawn = [0, 0], eyeHeight = 1.6, floorY = 0.8 },
	ref,
) {
	const { world, rapier } = useRapier();
	const { camera, size } = useThree();
	const bodyRef = useRef<RapierRigidBody>(null);
	const controllerRef = useRef<ReturnType<
		NonNullable<typeof world>['createCharacterController']
	> | null>(null);

	const vehicle = useMemo<PlayerVehicleHandle>(
		() => createPlayerVehicle({ maxSpeed: WASD_SPEED }),
		[],
	);
	const raycaster = useMemo(() => new Raycaster(), []);
	const floorPlane = useMemo(() => new Plane(new ThreeVector3(0, 1, 0), -floorY), [floorY]);
	const pathRef = useRef<readonly YukaVector3[]>([]);
	const yukaScratch = useRef(new YukaVector3());
	const desktopRef = useRef<DesktopFallback | null>(null);

	// Wire the keyboard fallback so WASD writes to the controller. Path
	// is cleared on any directional key — manual input takes priority.
	useEffect(() => {
		desktopRef.current = subscribeKeyboard();
		return () => desktopRef.current?.dispose();
	}, []);

	// Build the Rapier KinematicCharacterController on mount.
	useEffect(() => {
		if (!world) return;
		const controller = world.createCharacterController(COLLIDER_OFFSET);
		controller.setSlideEnabled(true);
		controller.setMaxSlopeClimbAngle(45 * (Math.PI / 180));
		controller.setApplyImpulsesToDynamicBodies(false);
		controllerRef.current = controller;
		return () => {
			world.removeCharacterController(controller);
			controllerRef.current = null;
		};
	}, [world]);

	useImperativeHandle(
		ref,
		() => ({
			tap(screenX, screenY) {
				if (!navMesh || !bodyRef.current) return;
				const body = bodyRef.current;
				const pos = body.translation();
				vehicle.sync(yukaScratch.current.set(pos.x, floorY, pos.z));

				const ndc = new Vector2((screenX / size.width) * 2 - 1, -((screenY / size.height) * 2 - 1));
				raycaster.setFromCamera(ndc, camera);
				const hit = raycaster.ray.intersectPlane(floorPlane, new ThreeVector3());
				if (!hit) return;
				const ok = vehicle.pathTo(navMesh, new YukaVector3(hit.x, floorY, hit.z));
				if (ok) {
					pathRef.current = (
						vehicle.vehicle.steering.behaviors[0] as unknown as {
							path: { _waypoints: YukaVector3[] };
						}
					).path._waypoints.slice();
				}
			},
			clear() {
				vehicle.clearPath();
				pathRef.current = [];
			},
			get path() {
				return pathRef.current;
			},
		}),
		[navMesh, raycaster, camera, size, floorPlane, vehicle, floorY],
	);

	useFrame((_state, dt) => {
		const body = bodyRef.current;
		const controller = controllerRef.current;
		if (!body || !controller) return;

		const pos = body.translation();

		// Build the desired translation delta. Priority:
		//   1. WASD if any directional key is held → cancels path.
		//   2. Yuka FollowPath while a path is active.
		const dir = desktopRef.current?.getDirection();
		let dx = 0;
		let dz = 0;
		if (dir && (dir.x !== 0 || dir.z !== 0)) {
			if (vehicle.hasPath) vehicle.clearPath();
			dx = dir.x * WASD_SPEED * dt;
			dz = dir.z * WASD_SPEED * dt;
			pathRef.current = [];
		} else if (vehicle.hasPath) {
			vehicle.sync(yukaScratch.current.set(pos.x, floorY, pos.z));
			const vel = vehicle.tick(dt);
			dx = vel.x * dt;
			dz = vel.z * dt;
			if (vehicle.arrived) {
				vehicle.clearPath();
				pathRef.current = [];
			}
		} else {
			return; // idle — no translation update
		}

		// Hand the desired delta to the Rapier character controller. It
		// resolves wall collisions by sliding; we read back the
		// corrected delta and apply it.
		const colliders = body.numColliders();
		if (colliders === 0) return;
		const collider = body.collider(0);
		controller.computeColliderMovement(collider, new rapier.Vector3(dx, 0, dz));
		const corrected = controller.computedMovement();
		body.setNextKinematicTranslation({
			x: pos.x + corrected.x,
			y: pos.y, // y is owned by the spawn — gravity disabled for now
			z: pos.z + corrected.z,
		});

		// Track camera to body + eye height. Camera rotation is owned by
		// PlayerCamera (yaw/pitch from drag-look in PRQ-08+); for now we
		// keep it pointing along -Z.
		const cam = camera as PerspectiveCamera;
		cam.position.set(pos.x + corrected.x, floorY + eyeHeight, pos.z + corrected.z);
	});

	return (
		<RigidBody
			ref={bodyRef}
			type="kinematicPosition"
			position={[spawn[0], floorY + CAPSULE_HEIGHT / 2 + CAPSULE_RADIUS, spawn[1]]}
			colliders={false}
			enabledRotations={[false, false, false]}
			ccd
		>
			<CapsuleCollider args={[CAPSULE_HEIGHT / 2, CAPSULE_RADIUS]} />
		</RigidBody>
	);
});
