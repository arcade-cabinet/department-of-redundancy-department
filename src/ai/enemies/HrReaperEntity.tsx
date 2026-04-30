import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, type RapierRigidBody, RigidBody } from '@react-three/rapier';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import type { Manifest } from '@/content/manifest';
import { usePaused } from '@/ecs/PauseContext';
import { Character } from '@/render/characters/Character';
import type { Vec3World } from '@/world/floor/floorRouter';
import { createRng } from '@/world/generator/rng';
import {
	applyDamageToReaper,
	createReaperFSM,
	REAPER_HP,
	type ReaperFSM,
	tickReaper,
} from './HrReaperFSM';
import { pickTeleportCell } from './reaperTeleport';

/**
 * HR Reaper R3F entity (PRQ-13 T1+T5 R3F mount). Wraps the pure FSM
 * with a Rapier kinematic capsule + the standard Character GLB tinted
 * auditor-amber. The host (Game.tsx) supplies: manifest, walkable
 * grid for teleport picks, getPlayerPosition, and applyPlayerDamage.
 *
 * Spec §0: only character with auditor-amber emissive. The
 * materialOverrides path on Character.tsx already accepts an emissive
 * tint via tierStyles; for the Reaper we patch it post-mount via the
 * wrapper's onSlugUpdate hook (alpha simplification — proper tint
 * channel lands in M2 with the broader material system).
 */

const REAPER_SCALE = 1.5;
const REAPER_RADIUS = 0.45;
const REAPER_HEIGHT = 1.4; // half-length of cylindrical part
const PERCEPTION_HZ = 5;

export interface HrReaperHandle {
	getPosition(): { x: number; y: number; z: number };
	damage(dmg: number): boolean; // returns true if killed
	readonly hp: number;
}

interface Props {
	manifest: Manifest;
	spawn: [number, number, number];
	getPlayerPosition: () => { x: number; y: number; z: number };
	applyPlayerDamage: (dmg: number) => boolean;
	onDeath?: (lastPos: Vec3World) => void;
	/** Walkable cell list for teleport picks. The host supplies this
	 *  from the navmesh region centers. Empty list disables teleport. */
	walkableCells?: readonly Vec3World[];
	seed?: string;
	floor?: number;
}

export const HrReaperEntity = forwardRef<HrReaperHandle, Props>(function HrReaperEntity(
	{
		manifest,
		spawn,
		getPlayerPosition,
		applyPlayerDamage,
		onDeath,
		walkableCells = [],
		seed = 'reaper',
		floor = 5,
	},
	ref,
) {
	const bodyRef = useRef<RapierRigidBody>(null);
	const groupRef = useRef<Group>(null);
	const fsmRef = useRef<ReaperFSM>(createReaperFSM(0, { x: spawn[0], y: spawn[1], z: spawn[2] }));
	const lastPerceptionRef = useRef(0);
	const [hp, setHp] = useState(REAPER_HP);
	const [dead, setDead] = useState(false);
	const teleportRng = useMemo(() => createRng(`${seed}::floor-${floor}::reaper-tp`), [seed, floor]);

	const paused = usePaused();
	const elapsedRef = useRef(0);

	useImperativeHandle(
		ref,
		() => ({
			getPosition() {
				const t = bodyRef.current?.translation();
				return t ? { x: t.x, y: t.y, z: t.z } : { x: spawn[0], y: spawn[1], z: spawn[2] };
			},
			damage(dmg) {
				const next = applyDamageToReaper(fsmRef.current, dmg);
				fsmRef.current = next;
				setHp(next.hp);
				if (next.state === 'death' && !dead) {
					setDead(true);
					onDeath?.(next.position);
					return true;
				}
				return false;
			},
			get hp() {
				return fsmRef.current.hp;
			},
		}),
		[dead, onDeath, spawn],
	);

	useFrame((_, dt) => {
		if (paused || dead) return;
		elapsedRef.current += dt;
		// Throttle perception + FSM tick to 5Hz to match middle manager.
		if (elapsedRef.current - lastPerceptionRef.current < 1 / PERCEPTION_HZ) return;
		lastPerceptionRef.current = elapsedRef.current;

		const player = getPlayerPosition();
		const candidate =
			walkableCells.length > 0
				? (pickTeleportCell(walkableCells, player, teleportRng) ?? undefined)
				: undefined;
		const next = tickReaper(fsmRef.current, {
			now: elapsedRef.current,
			playerPos: player,
			hasLOS: true,
			...(candidate !== undefined && { candidateTarget: candidate }),
		});
		fsmRef.current = next;

		// Apply teleport-arrive: snap the rigid body to the new pos.
		if (next.action.kind === 'teleport-arrive') {
			bodyRef.current?.setTranslation(
				{ x: next.action.target.x, y: next.action.target.y, z: next.action.target.z },
				true,
			);
		}

		// Fire hitscan: alpha shortcut — apply the damage directly. PRQ-09's
		// applyHitscanSpread + LOS check land in M2 with the broader hit-FX
		// surface. The Reaper's "always sees" rule means LOS is implied.
		if (next.action.kind === 'fire-hitscan') {
			applyPlayerDamage(next.action.damage);
		}
	});

	useEffect(() => {
		// Update userData for DevTools debugging + e2e probes.
		if (groupRef.current) groupRef.current.userData.hrReaperHp = hp;
	}, [hp]);

	if (dead) return null; // unmount immediately on death; floor-key pickup is the host's responsibility

	return (
		<RigidBody
			ref={bodyRef}
			type="kinematicPosition"
			position={spawn}
			colliders={false}
			lockRotations
		>
			<CapsuleCollider args={[REAPER_HEIGHT / 2, REAPER_RADIUS]} />
			<group ref={groupRef} scale={[REAPER_SCALE, REAPER_SCALE, REAPER_SCALE]}>
				<Character slug="hr-reaper" manifest={manifest} position={[0, 0, 0]} />
			</group>
		</RigidBody>
	);
});
