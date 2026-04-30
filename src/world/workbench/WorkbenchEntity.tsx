import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, type Group } from 'three';

const OPEN_RADIUS = 1.5;

interface Props {
	id: string;
	position: [number, number, number];
	getPlayerPosition: () => { x: number; y: number; z: number };
	onPlayerNear: () => void;
	/** When true, the host has opened the panel — suppresses re-fire of
	 *  onPlayerNear until the player walks away + comes back. */
	suppressed: boolean;
}

export function WorkbenchEntity({
	id,
	position,
	getPlayerPosition,
	onPlayerNear,
	suppressed,
}: Props) {
	const groupRef = useRef<Group>(null);
	const wasNearRef = useRef(false);
	const { scene } = useGLTF('/assets/models/props/desk.glb');
	const cloned = useMemo(() => scene.clone(true), [scene]);

	// Sit the desk on the floor.
	useEffect(() => {
		const bbox = new Box3().setFromObject(cloned);
		cloned.position.y = -bbox.min.y;
	}, [cloned]);

	useFrame(() => {
		const p = getPlayerPosition();
		const dx = p.x - position[0];
		const dz = p.z - position[2];
		const near = Math.hypot(dx, dz) <= OPEN_RADIUS;
		// Edge-trigger on (was-far → near) and gate on suppressed
		if (near && !wasNearRef.current && !suppressed) {
			onPlayerNear();
		}
		wasNearRef.current = near;
	});

	void id;

	return (
		<group ref={groupRef} position={position}>
			<primitive object={cloned} scale={1.2} />
			{/* Glowing terminal cube on top — the obvious visual cue */}
			<mesh position={[0, 1.2, 0]}>
				<boxGeometry args={[0.4, 0.3, 0.3]} />
				<meshStandardMaterial color="#2ea8c9" emissive="#2ea8c9" emissiveIntensity={1.5} />
			</mesh>
		</group>
	);
}
