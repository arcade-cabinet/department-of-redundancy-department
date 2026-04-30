import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Vector3 } from 'yuka';

type Props = {
	waypoints: readonly Vector3[];
	yOffset?: number;
	color?: string;
};

/**
 * Debug overlay drawing the active player path as a line strip + dot
 * per waypoint. Mounted under `?debug=path` (parent gates by URL flag).
 *
 * Cheap: builds a fresh BufferGeometry per waypoint change. With
 * typical paths under 20 segments this is microseconds.
 */
export function PathViz({ waypoints, yOffset = 0.04, color = '#FFD580' }: Props) {
	const geometry = useMemo(() => {
		if (waypoints.length < 2) return null;
		const positions: number[] = [];
		for (const w of waypoints) positions.push(w.x, w.y + yOffset, w.z);
		const g = new BufferGeometry();
		g.setAttribute('position', new Float32BufferAttribute(positions, 3));
		return g;
	}, [waypoints, yOffset]);

	if (!geometry) return null;
	return (
		<>
			<line>
				<primitive object={geometry} attach="geometry" />
				<lineBasicMaterial color={color} depthTest={false} transparent opacity={0.9} />
			</line>
			{waypoints.map((w) => (
				<mesh
					key={`wp-${w.x.toFixed(3)}-${w.y.toFixed(3)}-${w.z.toFixed(3)}`}
					position={[w.x, w.y + yOffset, w.z]}
				>
					<sphereGeometry args={[0.08, 8, 8]} />
					<meshBasicMaterial color={color} depthTest={false} transparent opacity={0.85} />
				</mesh>
			))}
		</>
	);
}

/** URL-flag reader: `?debug=path` or `?debug=*`. */
export function usePathVizFlag(): boolean {
	if (typeof window === 'undefined') return false;
	const flag = new URL(window.location.href).searchParams.get('debug');
	return flag === 'path' || flag === '*';
}
