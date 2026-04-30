import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Mesh } from 'three';

/**
 * Single in-flight projectile (PRQ-09 T4 deferred R3F mount, M2c3).
 *
 * Pure-data ballistics: caller supplies origin + direction + speed +
 * lifetime; on each frame the projectile translates by `direction *
 * speed * dt`. When lifetime expires OR distance from origin exceeds
 * `maxDistance`, fires `onExpire` and unmounts via the host.
 *
 * Hit detection lives at the host (Game.tsx in M2c4 wiring) — it
 * raycasts the projectile's swept segment against enemy capsule
 * colliders each frame. Keeping the projectile dumb means hosts can
 * batch hit checks across all in-flight projectiles per frame instead
 * of doing one raycast per Projectile component.
 *
 * Visual: a small emissive cube tinted by weapon-affinity color. The
 * three-hole-punch projectile is a 3-burst, so multiple Projectiles
 * mount simultaneously with staggered start times.
 */

const PROJECTILE_SIZE = 0.12;

export interface ProjectileProps {
	origin: [number, number, number];
	/** Unit-vector direction (xz; y is auto-zeroed for this pass — alpha
	 *  has no vertical aim). */
	direction: [number, number, number];
	/** World units per second. */
	speed: number;
	/** Auto-expire after this many milliseconds (lifetime cap). */
	lifetimeMs: number;
	/** Auto-expire after this many world units of travel (range cap). */
	maxDistance: number;
	/** Tint for the emissive material. */
	color?: string;
	/** Fired when lifetime / range elapses OR when host-side hit
	 *  detection commands a stop. */
	onExpire?: () => void;
	/** Per-tick position callback so hosts can ray-test the projectile's
	 *  swept segment. */
	onTick?: (pos: { x: number; y: number; z: number }) => void;
}

export function Projectile({
	origin,
	direction,
	speed,
	lifetimeMs,
	maxDistance,
	color = '#e0a33c',
	onExpire,
	onTick,
}: ProjectileProps) {
	const meshRef = useRef<Mesh>(null);
	const startMsRef = useRef(performance.now());
	const distanceRef = useRef(0);
	const [expired, setExpired] = useState(false);

	useEffect(() => {
		startMsRef.current = performance.now();
		distanceRef.current = 0;
	}, []);

	useFrame((_, dt) => {
		if (expired) return;
		const mesh = meshRef.current;
		if (!mesh) return;
		const dx = direction[0] * speed * dt;
		const dz = direction[2] * speed * dt;
		mesh.position.x += dx;
		mesh.position.z += dz;
		distanceRef.current += Math.hypot(dx, dz);
		onTick?.({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z });
		const elapsed = performance.now() - startMsRef.current;
		if (elapsed >= lifetimeMs || distanceRef.current >= maxDistance) {
			setExpired(true);
			onExpire?.();
		}
	});

	if (expired) return null;

	return (
		<mesh ref={meshRef} position={origin}>
			<boxGeometry args={[PROJECTILE_SIZE, PROJECTILE_SIZE, PROJECTILE_SIZE]} />
			<meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
		</mesh>
	);
}
