import { BufferAttribute, BufferGeometry, Mesh, Raycaster, Vector3 } from 'three';
import {
	acceleratedRaycast,
	computeBoundsTree,
	disposeBoundsTree,
	type MeshBVH,
} from 'three-mesh-bvh';
import { describe, expect, it } from 'vitest';
import { BLOCK_IDS } from '../blocks/BlockRegistry';
import { CHUNK_SIZE, ChunkData } from './ChunkData';
import { greedyMesh } from './greedyMesh';

// Install the BVH patch on three's BufferGeometry / Mesh prototype. Same
// install path the runtime <Chunk/> uses; double-installing is idempotent.
(BufferGeometry.prototype as { computeBoundsTree?: unknown }).computeBoundsTree =
	computeBoundsTree as never;
(BufferGeometry.prototype as { disposeBoundsTree?: unknown }).disposeBoundsTree =
	disposeBoundsTree as never;
Mesh.prototype.raycast = acceleratedRaycast;

const RAYCAST_COUNT = 1000;
/**
 * Per-raycast budget. Spec calls "< 1ms" on browser-tier hardware. CI
 * runners are slower than dev workstations, so we accept up to 2ms in
 * tests — the actual workstation reading is what matters for product
 * decisions; CI just guards against catastrophic regressions
 * (e.g. forgetting to call computeBoundsTree() drops perf 50×+).
 */
const PER_RAYCAST_MS_BUDGET = 2;

describe('Chunk BVH raycast (browser)', () => {
	it('1000 random raycasts on a populated chunk run under budget', () => {
		const chunk = new ChunkData();
		// Populate ~half the chunk volume with cubicle-wall, varied x/y/z
		// so the BVH has real splits to traverse rather than a single AABB.
		for (let y = 0; y < CHUNK_SIZE; y++) {
			for (let z = 0; z < CHUNK_SIZE; z++) {
				for (let x = 0; x < CHUNK_SIZE; x++) {
					if ((x + y + z) % 2 === 0) {
						chunk.set(x, y, z, BLOCK_IDS['cubicle-wall']);
					}
				}
			}
		}

		const mesh = greedyMesh(chunk);
		const geometry = new BufferGeometry();
		geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
		geometry.setAttribute('normal', new BufferAttribute(mesh.normals, 3));
		geometry.setAttribute('uv', new BufferAttribute(mesh.uvs, 2));
		geometry.setIndex(new BufferAttribute(mesh.indices, 1));
		// biome-ignore lint/suspicious/noExplicitAny: BVH method is added by patch
		(geometry as any).computeBoundsTree();

		const renderMesh = new Mesh(geometry);
		const ray = new Raycaster();

		// Without the BVH, raycast would walk every triangle; with it,
		// each ray is logarithmic in triangle count. Mean per ray drops
		// from ~5–20ms to << 1ms on this size.
		const start = performance.now();
		for (let i = 0; i < RAYCAST_COUNT; i++) {
			const origin = new Vector3(
				Math.random() * CHUNK_SIZE,
				CHUNK_SIZE * 2,
				Math.random() * CHUNK_SIZE,
			);
			const dir = new Vector3(0, -1, 0);
			ray.set(origin, dir);
			ray.intersectObject(renderMesh, false);
		}
		const elapsedMs = performance.now() - start;
		const perRayMs = elapsedMs / RAYCAST_COUNT;

		console.log(
			`BVH raycast: ${RAYCAST_COUNT} rays in ${elapsedMs.toFixed(2)}ms (${perRayMs.toFixed(3)}ms each)`,
		);
		expect(perRayMs).toBeLessThan(PER_RAYCAST_MS_BUDGET);

		// boundsTree is well-defined on the geometry post-build (sanity).
		const bvh = (geometry as unknown as { boundsTree?: MeshBVH }).boundsTree;
		expect(bvh).toBeDefined();
	});
});
