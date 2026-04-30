import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavMesh, Polygon, Vector3 } from 'yuka';
import { BLOCK_IDS } from '@/world/blocks/BlockRegistry';
import { CHUNK_SIZE, ChunkData } from '@/world/chunk/ChunkData';
import { FLOOR_CHUNKS_X, FLOOR_CHUNKS_Z } from '@/world/generator/floor';
import { createNavMeshHost } from './NavMeshHost';

const VOXEL_SIZE = 0.4;
const ORIGIN = -31 * VOXEL_SIZE;

function fakeBuildResult(): { navMesh: NavMesh; polygonCount: number } {
	const navMesh = new NavMesh();
	const poly = new Polygon().fromContour([
		new Vector3(0, 0, 0),
		new Vector3(1, 0, 0),
		new Vector3(1, 0, 1),
		new Vector3(0, 0, 1),
	]);
	navMesh.fromPolygons([poly]);
	return { navMesh, polygonCount: 1 };
}

function emptyFloor(): ChunkData[] {
	const out: ChunkData[] = [];
	for (let i = 0; i < FLOOR_CHUNKS_X * FLOOR_CHUNKS_Z; i++) out.push(new ChunkData());
	for (const c of out)
		for (let z = 0; z < CHUNK_SIZE; z++)
			for (let x = 0; x < CHUNK_SIZE; x++) c.set(x, 0, z, BLOCK_IDS['carpet-floor']);
	return out;
}

const baseInput = (chunks: ChunkData[]) => ({
	chunks,
	voxelSize: VOXEL_SIZE,
	originX: ORIGIN,
	originZ: ORIGIN,
});

describe('NavMeshHost', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('starts with no current navmesh', () => {
		const host = createNavMeshHost();
		expect(host.current).toBeNull();
		expect(host.rebuildCount).toBe(0);
		host.stop();
	});

	it('debounces multiple rebuild requests into a single build', async () => {
		const buildFn = vi.fn(fakeBuildResult);
		const host = createNavMeshHost({ debounceMs: 100, buildFn });
		const chunks = emptyFloor();
		host.requestRebuild(baseInput(chunks));
		host.requestRebuild(baseInput(chunks));
		host.requestRebuild(baseInput(chunks));
		expect(buildFn).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(150);
		expect(buildFn).toHaveBeenCalledTimes(1);
		expect(host.rebuildCount).toBe(1);
		expect(host.current).not.toBeNull();
		host.stop();
	});

	it('latest input wins when bursts collapse', async () => {
		const calls: number[] = [];
		const buildFn = vi.fn((input: { voxelSize: number }) => {
			calls.push(input.voxelSize);
			return fakeBuildResult();
		});
		const host = createNavMeshHost({ debounceMs: 100, buildFn });
		host.requestRebuild({ ...baseInput(emptyFloor()), voxelSize: 0.1 });
		host.requestRebuild({ ...baseInput(emptyFloor()), voxelSize: 0.4 }); // wins
		await vi.advanceTimersByTimeAsync(150);
		expect(calls).toEqual([0.4]);
		host.stop();
	});

	it('flush() forces an immediate rebuild', async () => {
		const buildFn = vi.fn(fakeBuildResult);
		const host = createNavMeshHost({ debounceMs: 100, buildFn });
		host.requestRebuild(baseInput(emptyFloor()));
		// Don't advance the timer; flush should fire it manually.
		await host.flush();
		expect(buildFn).toHaveBeenCalledTimes(1);
		expect(host.current).not.toBeNull();
		host.stop();
	});

	it('flush() with no pending request is a no-op (returns immediately)', async () => {
		const buildFn = vi.fn(fakeBuildResult);
		const host = createNavMeshHost({ debounceMs: 100, buildFn });
		await host.flush();
		expect(buildFn).not.toHaveBeenCalled();
		host.stop();
	});

	it('stop() cancels pending rebuild', async () => {
		const buildFn = vi.fn(fakeBuildResult);
		const host = createNavMeshHost({ debounceMs: 100, buildFn });
		host.requestRebuild(baseInput(emptyFloor()));
		host.stop();
		await vi.advanceTimersByTimeAsync(500);
		expect(buildFn).not.toHaveBeenCalled();
	});

	it('current keeps the previous build during a fresh in-flight rebuild', async () => {
		type Resolver = (r: ReturnType<typeof fakeBuildResult>) => void;
		const pending: { resolve: Resolver | null } = { resolve: null };
		const slowBuild = (): Promise<ReturnType<typeof fakeBuildResult>> =>
			new Promise<ReturnType<typeof fakeBuildResult>>((res) => {
				pending.resolve = res;
			});
		const host = createNavMeshHost({ debounceMs: 50, buildFn: slowBuild });

		// First build → completes immediately.
		const fast = fakeBuildResult();
		host.requestRebuild(baseInput(emptyFloor()));
		await vi.advanceTimersByTimeAsync(60);
		// Resolve the first build.
		pending.resolve?.(fast);
		await Promise.resolve();
		await Promise.resolve();
		expect(host.current).not.toBeNull();
		const firstNav = host.current;

		// Second build → don't resolve. current still holds the first.
		host.requestRebuild(baseInput(emptyFloor()));
		await vi.advanceTimersByTimeAsync(60);
		expect(host.current).toBe(firstNav);
		host.stop();
	});
});
