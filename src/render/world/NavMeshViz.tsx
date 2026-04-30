import { useEffect, useState } from 'react';
import { type BufferGeometry, Float32BufferAttribute, BufferGeometry as ThreeBG } from 'three';
import type { NavMesh } from 'yuka';

type Props = {
	navMesh: NavMesh | null;
	/** y-offset added to every vertex so the wireframe sits visibly
	 *  above the floor. Default 0.02. */
	yOffset?: number;
	color?: string;
};

/**
 * Debug overlay rendering the current `yuka.NavMesh` as a triangle
 * wireframe. Mounted under `?debug=navmesh` (parent gates by URL flag,
 * see useNavMeshVizFlag below).
 *
 * Yuka's NavMesh exposes `regions` — each region is a yuka Polygon
 * whose `edge` linked-list yields vertices. We walk it once per
 * navmesh-rebuild and rebuild the BufferGeometry. Positions only;
 * no normals/uvs since we render via lineSegments.
 */
export function NavMeshViz({ navMesh, yOffset = 0.02, color = '#7CFFB8' }: Props) {
	const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

	useEffect(() => {
		if (!navMesh) {
			setGeometry(null);
			return;
		}
		const positions: number[] = [];
		// `regions` is the public field; iterate for each polygon edge.
		const regions = (
			navMesh as NavMesh & {
				regions: Array<{
					edge: { vertex: { x: number; y: number; z: number }; next: unknown } | null;
				}>;
			}
		).regions;
		for (const region of regions) {
			const start = region.edge;
			if (!start) continue;
			let edge: { vertex: { x: number; y: number; z: number }; next: unknown } | null = start;
			let count = 0;
			// Walk the half-edge ring; build a fan from the first vertex.
			const verts: { x: number; y: number; z: number }[] = [];
			while (edge && count++ < 32) {
				verts.push(edge.vertex);
				edge = edge.next as typeof edge;
				if (edge === start) break;
			}
			// Triangle-fan-style line segments: pair each consecutive vert.
			for (let i = 0; i < verts.length; i++) {
				const a = verts[i];
				const b = verts[(i + 1) % verts.length];
				if (!a || !b) continue;
				positions.push(a.x, a.y + yOffset, a.z);
				positions.push(b.x, b.y + yOffset, b.z);
			}
		}

		if (positions.length === 0) {
			setGeometry(null);
			return;
		}
		const g = new ThreeBG();
		g.setAttribute('position', new Float32BufferAttribute(positions, 3));
		setGeometry(g);

		return () => {
			g.dispose();
		};
	}, [navMesh, yOffset]);

	if (!geometry) return null;
	return (
		<lineSegments geometry={geometry}>
			<lineBasicMaterial color={color} depthTest={false} transparent opacity={0.85} />
		</lineSegments>
	);
}

/** URL-flag reader: `?debug=navmesh` or `?debug=*`. */
export function useNavMeshVizFlag(): boolean {
	if (typeof window === 'undefined') return false;
	const flag = new URL(window.location.href).searchParams.get('debug');
	return flag === 'navmesh' || flag === '*';
}
