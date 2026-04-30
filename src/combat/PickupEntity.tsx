import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { Mesh } from 'three';
import type { PickupKind } from './pickups';

/**
 * Pickup entity (PRQ-09 T4 deferred R3F mount, M2c3). Spawns on enemy
 * death; visible cube tinted by kind; auto-collects on player
 * proximity within `pickupRadius`.
 *
 * Animation: a slow Y-bob + spin per spec §0 ("rises into the player"
 * collect anim). Collection itself is instant — the host applies the
 * effect via combat/pickups.applyPickup, then unmounts this entity by
 * dropping it from its list.
 */

const PICKUP_SIZE = 0.18;
const PICKUP_RADIUS = 0.7;
const BOB_PERIOD_S = 1.6;
const BOB_HEIGHT = 0.08;
const SPIN_RAD_PER_S = 1.5;

const COLOR_BY_KIND: Readonly<Record<PickupKind, string>> = Object.freeze({
	'binder-clips': '#2ea8c9',
	coffee: '#3f8e5a',
	donut: '#e0a33c',
	briefcase: '#c7b89a',
});

export interface PickupEntityProps {
	kind: PickupKind;
	position: [number, number, number];
	getPlayerPosition: () => { x: number; y: number; z: number };
	onCollect: (kind: PickupKind) => void;
}

export function PickupEntity({ kind, position, getPlayerPosition, onCollect }: PickupEntityProps) {
	const meshRef = useRef<Mesh>(null);
	const elapsedRef = useRef(0);
	const [collected, setCollected] = useState(false);

	useFrame((_, dt) => {
		if (collected) return;
		elapsedRef.current += dt;
		const mesh = meshRef.current;
		if (!mesh) return;
		// Y-bob.
		const bob = Math.sin((elapsedRef.current / BOB_PERIOD_S) * Math.PI * 2) * BOB_HEIGHT;
		mesh.position.y = position[1] + bob;
		// Spin.
		mesh.rotation.y = elapsedRef.current * SPIN_RAD_PER_S;
		// Auto-collect on proximity.
		const player = getPlayerPosition();
		const dx = player.x - mesh.position.x;
		const dz = player.z - mesh.position.z;
		if (Math.hypot(dx, dz) <= PICKUP_RADIUS) {
			setCollected(true);
			onCollect(kind);
		}
	});

	if (collected) return null;
	const color = COLOR_BY_KIND[kind];
	return (
		<mesh ref={meshRef} position={position}>
			<boxGeometry args={[PICKUP_SIZE, PICKUP_SIZE, PICKUP_SIZE]} />
			<meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
		</mesh>
	);
}
