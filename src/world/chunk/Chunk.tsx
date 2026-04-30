import { useTexture } from '@react-three/drei';
import { RigidBody, TrimeshCollider } from '@react-three/rapier';
import { useMemo, useRef } from 'react';
import {
	BufferAttribute,
	BufferGeometry,
	type Mesh,
	NearestFilter,
	RepeatWrapping,
	SRGBColorSpace,
} from 'three';
import { computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { TILESET_PATH } from '../blocks/tileset';
import type { ChunkData } from './ChunkData';
import { greedyMesh } from './greedyMesh';

// Patch BufferGeometry once at module load so any Chunk geometry can call
// computeBoundsTree(). three-mesh-bvh recommends this monkey-patch as the
// idiomatic install path; it's safe to call multiple times (idempotent).
// The library declares the BufferGeometry augmentation as returning
// `MeshBVH`, while the standalone export returns `GeometryBVH` — same
// shape at runtime, but the type widening trips strict-mode tsc; the
// `as never` cast is the supported workaround per the library docs.
(BufferGeometry.prototype as { computeBoundsTree?: unknown }).computeBoundsTree =
	computeBoundsTree as never;
(BufferGeometry.prototype as { disposeBoundsTree?: unknown }).disposeBoundsTree =
	disposeBoundsTree as never;

type Props = {
	chunk: ChunkData;
	/** World-space origin of this chunk's (0,0,0) corner. */
	origin?: [number, number, number];
};

/**
 * Single chunk's render mesh. Builds a `BufferGeometry` from the
 * greedy-meshed `ChunkData`, attaches a three-mesh-bvh `boundsTree` for
 * raycasts (mining, AI line-of-sight), and renders with the shared
 * tileset atlas as a `MeshStandardMaterial`.
 *
 * Memoized on `(chunk, dirty)` so we don't re-mesh on every render — only
 * when the chunk changes. Re-meshing is relatively cheap (a 16³ chunk is
 * ~few ms on desktop) but spec §12 budgets are tight on mobile.
 *
 * NearestFilter on the texture is intentional: linear filtering would
 * bleed adjacent atlas tiles into each other at low pixel densities,
 * producing visible color seams along chunk edges. PSX-style nearest
 * sampling reads sharp and matches the lo-fi aesthetic.
 */
export function Chunk({ chunk, origin = [0, 0, 0] }: Props) {
	const tileset = useTexture(TILESET_PATH);
	tileset.magFilter = NearestFilter;
	tileset.minFilter = NearestFilter;
	tileset.wrapS = RepeatWrapping;
	tileset.wrapT = RepeatWrapping;
	tileset.colorSpace = SRGBColorSpace;
	// Atlas was authored origin-bottom-left to match three's UV space;
	// the WebP storage is top-down, so flipY=true (default) converts —
	// keep three's default. Explicit for clarity:
	tileset.flipY = true;

	const meshRef = useRef<Mesh>(null);

	const { geometry, trimeshArgs } = useMemo(() => {
		const mesh = greedyMesh(chunk);
		const g = new BufferGeometry();
		g.setAttribute('position', new BufferAttribute(mesh.positions, 3));
		g.setAttribute('normal', new BufferAttribute(mesh.normals, 3));
		g.setAttribute('uv', new BufferAttribute(mesh.uvs, 2));
		g.setIndex(new BufferAttribute(mesh.indices, 1));
		g.computeBoundingBox();
		g.computeBoundingSphere();
		// boundsTree powers `mesh.raycast()` after we set
		// `mesh.raycast = acceleratedRaycast` — but for the renderer we
		// just need the tree to exist; PRQ-03 T6 will wire the accelerated
		// raycast on the actual mesh ref.
		g.computeBoundsTree?.();
		// Rapier TrimeshCollider takes (vertices, indices) tuples. Reuse
		// the same geometry buffers — Rapier copies them on the wasm
		// side, so subsequent geometry edits don't affect the collider.
		const trimeshTuple: [Float32Array, Uint32Array] = [mesh.positions, mesh.indices];
		return { geometry: g, trimeshArgs: trimeshTuple };
	}, [chunk]);

	return (
		<RigidBody type="fixed" colliders={false} position={origin}>
			<mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
				<meshStandardMaterial map={tileset} roughness={0.85} metalness={0} />
			</mesh>
			<TrimeshCollider args={trimeshArgs} />
		</RigidBody>
	);
}
