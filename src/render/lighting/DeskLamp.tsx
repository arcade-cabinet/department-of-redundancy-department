import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { PointLight } from 'three';

type Props = {
	position: [number, number, number];
	/** Whether this lamp is currently in the active set (set by the culler upstream). */
	active: boolean;
	intensity?: number;
	distance?: number;
	color?: string;
};

/**
 * Per-occupied-cubicle warm desk lamp. The active flag is computed once per
 * frame by `<DeskLampGroup/>` (which runs the distance cull); inactive
 * lamps render with intensity 0 so we don't pay the per-light shader cost
 * on materials that already evaluate the lighting equation.
 *
 * Why intensity-zero rather than unmount? PointLights are cheap to *mount*
 * but expensive to *evaluate per fragment*. three.js compiles shader
 * variants per active light count, so churning mounts every frame
 * recompiles shaders — a 60ms hitch each time. Mount once, gate via
 * intensity, recompile once at scene init.
 */
export function DeskLamp({
	position,
	active,
	intensity = 0.8,
	distance = 4,
	color = '#FFD9A0',
}: Props) {
	const ref = useRef<PointLight>(null);

	useFrame(() => {
		if (!ref.current) return;
		ref.current.intensity = active ? intensity : 0;
	});

	return (
		<pointLight
			ref={ref}
			position={position}
			intensity={active ? intensity : 0}
			distance={distance}
			color={color}
			decay={2}
		/>
	);
}
