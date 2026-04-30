import { useEffect, useState } from 'react';
import type { NavMesh } from 'yuka';
import { VOXEL_CENTER_X, VOXEL_CENTER_Z } from '@/render/world/ChunkLayer';
import { generateFloor } from '@/world/generator/floor';
import { createNavMeshHost } from './NavMeshHost';

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
	navMesh: NavMesh | null;
} {
	// IMPORTANT: do NOT memoize the host here. React StrictMode mounts →
	// unmounts → mounts, and the cleanup below calls host.stop(), which
	// permanently flips a `stopped` flag inside the host. On the second
	// mount the *same* memoized host rejects every requestRebuild because
	// `stopped` is true, so the navmesh never finishes building, the
	// player can never path, enemies can never path. Owning the host in a
	// ref keyed off seed+floor (created on demand inside the effect)
	// gives each StrictMode pass a fresh, alive host.
	const [navMesh, setNavMesh] = useState<NavMesh | null>(null);

	useEffect(() => {
		const host = createNavMeshHost();
		const result = generateFloor(seed, floor);
		host.requestRebuild({
			chunks: result.chunks,
			voxelSize,
			originX: -VOXEL_CENTER_X * voxelSize,
			originZ: -VOXEL_CENTER_Z * voxelSize,
		});
		let cancelled = false;
		const tick = () => {
			if (cancelled) return;
			if (host.current !== null) setNavMesh(host.current);
		};
		const id = setInterval(tick, 50);
		return () => {
			cancelled = true;
			clearInterval(id);
			host.stop();
			// OOM fix (2026-04-30): null out the previous floor's yuka
			// NavMesh so it can be GC'd. Without this the React state
			// kept the regions/edges/polygons reachable across floor
			// swaps (~2 MB / swap leak). The next floor's effect will
			// setNavMesh again once its host's build completes.
			setNavMesh(null);
		};
	}, [seed, floor, voxelSize]);

	return { navMesh };
}
