import { useEffect, useMemo, useState } from 'react';
import type { NavMesh } from 'yuka';
import { VOXEL_CENTER_X, VOXEL_CENTER_Z } from '@/render/world/ChunkLayer';
import { generateFloor } from '@/world/generator/floor';
import { createNavMeshHost, type NavMeshHost } from './NavMeshHost';

/**
 * Hook that owns a NavMeshHost driven by the current floor's chunks.
 * Fires `requestRebuild()` on mount and any time `seed` or `floor`
 * change (the player took a Up/Down door). Components reading the
 * navmesh re-render when `host.current` updates.
 *
 * Note: this hook regenerates chunks from the floor generator on every
 * (seed, floor) change. PRQ-04's persistence wires up to override
 * pristine chunks with their dirty_blob; PRQ-11's mining triggers
 * incremental rebuilds. For PRQ-06 we just rebuild from the seed.
 */

export function useNavMesh(
	seed: string,
	floor: number,
	voxelSize = 0.4,
): {
	host: NavMeshHost;
	navMesh: NavMesh | null;
} {
	const host = useMemo(() => createNavMeshHost(), []);
	const [navMesh, setNavMesh] = useState<NavMesh | null>(null);

	useEffect(() => {
		const result = generateFloor(seed, floor);
		host.requestRebuild({
			chunks: result.chunks,
			voxelSize,
			originX: -VOXEL_CENTER_X * voxelSize,
			originZ: -VOXEL_CENTER_Z * voxelSize,
		});
		// Poll for completion and update local state. The host's debounce
		// + async build means we see `current` change after ~100ms.
		let cancelled = false;
		const tick = () => {
			if (cancelled) return;
			if (host.current !== navMesh) setNavMesh(host.current);
		};
		const id = setInterval(tick, 50);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [host, seed, floor, voxelSize, navMesh]);

	useEffect(() => {
		return () => host.stop();
	}, [host]);

	return { host, navMesh };
}
