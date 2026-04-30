import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, type Group, MathUtils, Vector3 } from 'three';
import type { Tier } from '@/ecs/components/Equipped';

const PICKUP_RADIUS = 1.2; // world units; player must be within this XZ distance

const TIER_COLOR: Record<Tier, string> = {
	T1: '#f4f1ea', // paper white
	T2: '#e0a33c', // terminal amber
	T3: '#2ea8c9', // toner cyan
};

interface Props {
	id: string;
	glb: string; // basename, e.g. 'weapon-ak47.glb'
	tier: Tier;
	position: [number, number, number];
	getPlayerPosition: () => { x: number; y: number; z: number };
	onCollect: () => void;
}

export function WeaponPickup({ id, glb, tier, position, getPlayerPosition, onCollect }: Props) {
	const groupRef = useRef<Group>(null);
	const collectedRef = useRef(false);
	const url = `/assets/models/weapons/${glb}`;
	const { scene } = useGLTF(url);

	// Per-instance scene clone so multiple identical pickups don't share a
	// material instance.
	const cloned = useMemo(() => scene.clone(true), [scene]);

	// Normalize the GLB origin to the bbox bottom so the model sits
	// flat on the floor (the extraction pinned the origin at the grip
	// which is offset relative to the model bounds).
	useEffect(() => {
		const bbox = new Box3().setFromObject(cloned);
		const offsetY = -bbox.min.y;
		cloned.position.y = offsetY;
	}, [cloned]);

	useFrame((_, dt) => {
		if (collectedRef.current) return;
		const g = groupRef.current;
		if (!g) return;
		// Slow rotation + bob for readability
		g.rotation.y += dt * 0.6;
		g.position.y = position[1] + Math.sin(performance.now() / 400) * 0.06;

		// Proximity check
		const p = getPlayerPosition();
		const dx = p.x - position[0];
		const dz = p.z - position[2];
		if (Math.hypot(dx, dz) <= PICKUP_RADIUS) {
			collectedRef.current = true;
			onCollect();
		}
	});

	// id is passed for React key + future logging (matches PickupEntity.tsx pattern).
	void id;

	const tierColor = TIER_COLOR[tier];

	return (
		<group ref={groupRef} position={position}>
			<primitive object={cloned} scale={3} />
			{/* Tier glow ring */}
			<mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<ringGeometry args={[0.4, 0.55, 24]} />
				<meshStandardMaterial
					color={tierColor}
					emissive={tierColor}
					emissiveIntensity={1.5}
					transparent
					opacity={0.7}
				/>
			</mesh>
		</group>
	);
}

// Suppress unused imports (MathUtils kept for future variant tinting).
void MathUtils;
void Vector3;
