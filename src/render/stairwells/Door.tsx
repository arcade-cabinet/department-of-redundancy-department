import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Group } from 'three';

/**
 * Door visualization for stairwell up-doors and down-doors (PRQ-12 T1).
 *
 * Alpha aesthetic: a stamped two-panel door with a colored lintel
 * label. The visible mesh is two thin slab meshes hinged on opposite
 * sides; on `open=true` they rotate 90° outward (~300ms via useFrame
 * tween) before `onOpened` fires. The runtime then triggers the
 * fade-cut + swap sequence. The full GLB-backed door lands in M2 /
 * PRQ-14 polish.
 *
 * Position is in WORLD coords. Caller (Game/World) computes the world
 * coord from `floorResult.upDoor` via floorRouter.voxelToWorld.
 */

const DOOR_WIDTH = 1.2;
const DOOR_HEIGHT = 2.4;
const PANEL_WIDTH = DOOR_WIDTH / 2;
const PANEL_THICKNESS = 0.08;
const OPEN_DURATION_MS = 300;

export interface DoorProps {
	position: [number, number, number];
	direction: 'up' | 'down';
	open: boolean;
	onOpened?: () => void;
}

export function Door({ position, direction, open, onOpened }: DoorProps) {
	const groupRef = useRef<Group>(null);
	const leftRef = useRef<Group>(null);
	const rightRef = useRef<Group>(null);
	// Tween state in a ref so useFrame doesn't re-render every tick.
	// Note: firedOpened resets on every open→close→open transition; if
	// the host flips `open` rapidly within one tween, openedFraction
	// can lag the prop. Door taps gate this in practice (pendingDir
	// blocks re-tap), so the simple guard is enough.
	const stateRef = useRef({ openedFraction: 0, lastOpen: false, firedOpened: false });

	useEffect(() => {
		if (open !== stateRef.current.lastOpen) {
			stateRef.current.lastOpen = open;
			stateRef.current.firedOpened = false;
		}
	}, [open]);

	useFrame((_, dtSec) => {
		const s = stateRef.current;
		const target = open ? 1 : 0;
		const direction01 = target > s.openedFraction ? 1 : -1;
		const speed = 1000 / OPEN_DURATION_MS;
		s.openedFraction = clamp(s.openedFraction + direction01 * speed * dtSec, 0, 1);
		const angle = (s.openedFraction * Math.PI) / 2;
		if (leftRef.current) leftRef.current.rotation.y = -angle;
		if (rightRef.current) rightRef.current.rotation.y = angle;
		if (open && s.openedFraction >= 1 && !s.firedOpened) {
			s.firedOpened = true;
			onOpened?.();
		}
	});

	const tint = direction === 'up' ? '#c89c4a' : '#5a7d8c';

	return (
		<group ref={groupRef} position={position} userData={{ doorDirection: direction }}>
			<group ref={leftRef} position={[-PANEL_WIDTH / 2, 0, 0]}>
				<mesh position={[PANEL_WIDTH / 2, DOOR_HEIGHT / 2, 0]} castShadow>
					<boxGeometry args={[PANEL_WIDTH, DOOR_HEIGHT, PANEL_THICKNESS]} />
					<meshStandardMaterial color={tint} roughness={0.7} metalness={0.1} />
				</mesh>
			</group>
			<group ref={rightRef} position={[PANEL_WIDTH / 2, 0, 0]}>
				<mesh position={[-PANEL_WIDTH / 2, DOOR_HEIGHT / 2, 0]} castShadow>
					<boxGeometry args={[PANEL_WIDTH, DOOR_HEIGHT, PANEL_THICKNESS]} />
					<meshStandardMaterial color={tint} roughness={0.7} metalness={0.1} />
				</mesh>
			</group>
			<mesh position={[0, DOOR_HEIGHT + 0.2, 0]}>
				<planeGeometry args={[DOOR_WIDTH, 0.2]} />
				<meshStandardMaterial
					color={tint}
					emissive={tint}
					emissiveIntensity={0.4}
					roughness={0.5}
				/>
			</mesh>
		</group>
	);
}

function clamp(v: number, min: number, max: number): number {
	return v < min ? min : v > max ? max : v;
}
