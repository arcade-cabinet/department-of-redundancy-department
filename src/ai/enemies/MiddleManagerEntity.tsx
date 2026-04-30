import { useFrame, useThree } from '@react-three/fiber';
import { CapsuleCollider, type RapierRigidBody, RigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Group, Raycaster } from 'three';
import type { NavMesh } from 'yuka';
import { Vector3 as YukaVector3 } from 'yuka';
import { createPlayerVehicle } from '@/ai/core/PlayerVehicle';
import { freshMemory, updateMemory, VisionCone } from '@/ai/perception/Vision';
import { applyHitscanSpread } from '@/combat/hitscan';
import type { Manifest } from '@/content/manifest';
import { applyDamage, freshHealth, isDead, MANAGER_MAX_HP } from '@/ecs/components/Health';
import { usePaused } from '@/ecs/PauseContext';
import { Character } from '@/render/characters/Character';
import { createRng } from '@/world/generator/rng';
import { type FSMState, freshFSM, tick as fsmTick, killFSM } from './MiddleManagerFSM';

type Props = {
	manifest: Manifest;
	navMesh: NavMesh | null;
	/** Spawn world position (foot of capsule). */
	spawn: [number, number, number];
	/** Reads the player's current world position. Stored as a ref so the
	 *  enemy doesn't re-render on every player move. */
	getPlayerPosition: () => { x: number; y: number; z: number };
	/** Applies damage to the player. Returns true if player is now dead. */
	applyPlayerDamage: (n: number) => boolean;
	/** Bumps the kills counter (PRQ-04 kills repo wired upstream). */
	onKill: (slug: string) => void;
};

const VISION_FOV = Math.PI / 2; // 90°
const VISION_RANGE = 12;
const HITSCAN_DAMAGE = 8;
const HITSCAN_ACCURACY = 0.6;
const FLOOR_Y = 0.8;
const PERCEPTION_HZ = 5;

/**
 * Single middle-manager entity. Combines:
 *   - kinematic Rapier body for collision (capsule, slides on walls).
 *   - PlayerVehicle wrapper so it follows yuka paths the same way the
 *     player does.
 *   - VisionCone perception, ticked at 5Hz to cap raycast cost.
 *   - MiddleManager FSM for behavior decisions.
 *   - Character render with state="walk"/"idle"/"hit"/"death" driven
 *     from FSM transitions.
 *   - Health component with hit-flash / despawn on death.
 *
 * LOS check is deferred: T9 wires the BVH raycast against the chunk
 * meshes. For now visibility = within cone + within range. The result
 * is enemies that "see through walls" within range — gameplay-wise
 * still readable in tests; visible regression in dev mode (managers
 * will path-fail but engage anyway). Acceptable scope for the first
 * runtime mount; T9 closes the loop.
 */
export function MiddleManagerEntity({
	manifest,
	navMesh,
	spawn,
	getPlayerPosition,
	applyPlayerDamage,
	onKill,
}: Props) {
	const { camera } = useThree();
	const bodyRef = useRef<RapierRigidBody>(null);
	const groupRef = useRef<Group>(null);
	const vehicle = useMemo(() => createPlayerVehicle({ maxSpeed: 1.0 }), []);
	const visionCone = useMemo(() => new VisionCone({ fov: VISION_FOV, range: VISION_RANGE }), []);
	const memoryRef = useRef(freshMemory());
	const fsmRef = useRef<FSMState>(freshFSM(0));
	const lastPerceptionAt = useRef(0);
	const visibleRef = useRef(false);
	const [, setHealth] = useState(() => freshHealth(MANAGER_MAX_HP));
	const [characterState, setCharacterState] = useState<
		'idle' | 'walk' | 'run' | 'attack' | 'hit' | 'death'
	>('idle');
	const [despawned, setDespawned] = useState(false);

	const raycaster = useMemo(() => new Raycaster(), []);
	const yukaScratch = useRef(new YukaVector3());
	const fireRngRef = useRef(createRng(`fire::${spawn[0]}-${spawn[2]}`));

	// Synthesize a "playerVisible" check: distance + FOV cone. T9 will
	// AND this with a BVH raycast.
	const checkVisibility = (
		selfX: number,
		selfZ: number,
		forwardX: number,
		forwardZ: number,
	): boolean => {
		const player = getPlayerPosition();
		return visionCone.canSee(
			yukaScratch.current.set(selfX, FLOOR_Y, selfZ),
			new YukaVector3(forwardX, 0, forwardZ),
			new YukaVector3(player.x, FLOOR_Y, player.z),
			true, // LOS placeholder (T9 swaps in BVH raycast)
		);
	};

	// Public hooks for Game.tsx-side handlers (e.g. melee from player) to
	// damage this manager. Exposed via a ref attached to the root group.
	useEffect(() => {
		if (!groupRef.current) return;
		const group = groupRef.current;
		const damageFn = (dmg: number) => {
			setHealth((h) => {
				const next = applyDamage(h, dmg);
				if (isDead(next) && !isDead(h)) {
					fsmRef.current = killFSM(fsmRef.current, performance.now() / 1000);
					setCharacterState('death');
					onKill('middle-manager');
				} else if (next.damageFlashTimer > 0) {
					setCharacterState('hit');
				}
				return next;
			});
		};
		(group.userData as { damage?: (n: number) => void }).damage = damageFn;
	}, [onKill]);

	const paused = usePaused();
	useFrame(() => {
		if (paused || despawned) return;
		const body = bodyRef.current;
		if (!body) return;
		const pos = body.translation();
		const now = performance.now() / 1000;

		// Perception throttle.
		if (now - lastPerceptionAt.current >= 1 / PERCEPTION_HZ) {
			lastPerceptionAt.current = now;
			const forward = vehicle.vehicle.forward;
			visibleRef.current = checkVisibility(pos.x, pos.z, forward.x, forward.z);
			memoryRef.current = updateMemory(
				memoryRef.current,
				visibleRef.current,
				now,
				yukaScratch.current.set(getPlayerPosition().x, FLOOR_Y, getPlayerPosition().z),
			);
		}

		// FSM tick.
		const result = fsmTick(
			fsmRef.current,
			{
				visible: visibleRef.current,
				playerPosition: yukaScratch.current.set(
					getPlayerPosition().x,
					FLOOR_Y,
					getPlayerPosition().z,
				),
				selfPosition: yukaScratch.current.set(pos.x, FLOOR_Y, pos.z),
				memory: memoryRef.current,
				now,
				arrived: vehicle.arrived,
				pickPatrolTarget: (self, rng) => {
					if (!navMesh) return null;
					const dx = (rng.next() - 0.5) * 16;
					const dz = (rng.next() - 0.5) * 16;
					return new YukaVector3(self.x + dx, FLOOR_Y, self.z + dz);
				},
				pickRepositionTarget: (self, rng) => {
					if (!navMesh) return null;
					const dx = (rng.next() - 0.5) * 8;
					const dz = (rng.next() - 0.5) * 8;
					return new YukaVector3(self.x + dx, FLOOR_Y, self.z + dz);
				},
			},
			createRng,
		);

		fsmRef.current = result.state;

		// Apply action.
		if (result.action.setTarget && navMesh) {
			vehicle.sync(yukaScratch.current.set(pos.x, FLOOR_Y, pos.z));
			vehicle.pathTo(navMesh, result.action.setTarget);
		}
		if (result.action.fireHitscan) {
			fireHitscanAtPlayer(pos.x, pos.z);
		}
		if (result.action.despawn) {
			setDespawned(true);
			return;
		}

		// Sync the Character state to the FSM. Death is set in damageFn
		// when HP hits zero; transient 'hit' is also set there. Here we
		// map non-terminal states. Reviewer feedback on PR #15: engage
		// is "stand and fire" not "walk" — managers were hop-walking
		// while shooting, which read wrong. Engage maps to 'idle' (or
		// 'attack' on the firing frame, set below in the fire branch).
		if (result.state.name !== 'death') {
			const next: 'walk' | 'idle' =
				result.state.name === 'patrol' ||
				result.state.name === 'investigate' ||
				result.state.name === 'reposition'
					? 'walk'
					: 'idle';
			if (characterState !== next && characterState !== 'hit' && characterState !== 'attack') {
				setCharacterState(next);
			}
		}
		if (result.action.fireHitscan && characterState !== 'hit') {
			setCharacterState('attack');
			// Snap back to engage's idle pose after the brief attack lunge.
			setTimeout(() => setCharacterState((s) => (s === 'attack' ? 'idle' : s)), 130);
		}

		// Move via vehicle if it has a path.
		if (vehicle.hasPath) {
			vehicle.sync(yukaScratch.current.set(pos.x, FLOOR_Y, pos.z));
			const vel = vehicle.tick(1 / 60);
			body.setNextKinematicTranslation({
				x: pos.x + vel.x * (1 / 60),
				y: pos.y,
				z: pos.z + vel.z * (1 / 60),
			});
			if (Math.abs(vel.x) > 0.01 || Math.abs(vel.z) > 0.01) {
				vehicle.vehicle.lookAt(yukaScratch.current.set(pos.x + vel.x, FLOOR_Y, pos.z + vel.z));
			}
		} else if (result.action.facePlayer) {
			const player = getPlayerPosition();
			vehicle.vehicle.lookAt(yukaScratch.current.set(player.x, FLOOR_Y, player.z));
		}
	});

	const fireHitscanAtPlayer = (selfX: number, selfZ: number): void => {
		const player = getPlayerPosition();
		const dx = player.x - selfX;
		const dz = player.z - selfZ;
		const dist = Math.hypot(dx, dz);
		if (dist === 0) return;
		const aim = new YukaVector3(dx / dist, 0, dz / dist);
		const ray = applyHitscanSpread({
			origin: new YukaVector3(selfX, FLOOR_Y + 1, selfZ),
			direction: aim,
			accuracy: HITSCAN_ACCURACY,
			rng: fireRngRef.current,
		});
		// Simple distance-from-ray hit check (T9+ will swap for a real
		// BVH raycast against player capsule + world chunks).
		// Reviewer feedback on PR #15: must reject targets BEHIND the
		// shooter — the previous cross-product check was direction-
		// agnostic so a wide spread cone could "hit" players directly
		// behind. Forward-distance check (positive dot product) plus a
		// max-range gate close that hole.
		const offX = player.x - selfX;
		const offZ = player.z - selfZ;
		const fwdDist = ray.direction.x * offX + ray.direction.z * offZ;
		if (fwdDist <= 0 || fwdDist > VISION_RANGE) return;
		const cross = Math.abs(ray.direction.x * offZ - ray.direction.z * offX);
		// `cross` is sin(theta) * |offset| → perpendicular distance from
		// player to the ray line. <0.5u counts as a hit.
		if (cross < 0.5) {
			const playerDead = applyPlayerDamage(HITSCAN_DAMAGE);
			void playerDead; // routing in Game.tsx handles game-over
		}
		// Suppress unused-var warning for raycaster + camera until T9 swap.
		void raycaster;
		void camera;
	};

	if (despawned) return null;

	return (
		<group ref={groupRef}>
			<RigidBody
				ref={bodyRef}
				type="kinematicPosition"
				position={spawn}
				colliders={false}
				enabledRotations={[false, false, false]}
			>
				<CapsuleCollider args={[0.5, 0.3]} />
			</RigidBody>
			<Character
				slug="middle-manager"
				manifest={manifest}
				position={spawn}
				state={characterState}
				speed={characterState === 'walk' ? 1.0 : 0}
			/>
		</group>
	);
}
