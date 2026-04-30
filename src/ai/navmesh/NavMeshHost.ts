import type { NavMesh } from 'yuka';
import type { ChunkData } from '@/world/chunk/ChunkData';
import { buildNavMesh, type NavMeshBuildInput, type NavMeshBuildResult } from './builder';

/**
 * Debounced navmesh host. Owns the most-recently-built `yuka.NavMesh`
 * for the current floor. Callers (the dirty-chunks event bus from the
 * koota world; the floor-change handler when the player takes a door)
 * fire `requestRebuild()`; the host coalesces bursts via a 100ms debounce
 * (spec §7) and runs the actual build off-frame.
 *
 * Web-Worker deferred: the spec calls for a worker thread, but the
 * builder's current 64×64 perf is well under frame budget on desktop
 * and modern phones (≤30ms typical). We keep the API ready for a
 * worker swap — the rebuild fn is wholly opaque to callers — but
 * land the in-thread version first to keep the surface small. PRQ-18
 * perf pass benchmarks on real mobile, then decides whether to invest
 * in the worker.
 *
 * The host exposes `current` (the latest finished navmesh) synchronously
 * so the player vehicle's tick can always read a navmesh without await.
 * During a rebuild, `current` keeps the previous value — the player
 * never has a "pathfinding broken" frame.
 */

export interface NavMeshHostOptions {
	debounceMs?: number;
	/** Override the build fn (test injection / future worker swap). */
	buildFn?: (input: NavMeshBuildInput) => Promise<NavMeshBuildResult> | NavMeshBuildResult;
}

export interface NavMeshHost {
	/** Last-built navmesh, or null before the first build completes. */
	readonly current: NavMesh | null;
	/** Diagnostics: total rebuilds completed since construction. */
	readonly rebuildCount: number;
	/** True while a rebuild is queued or in-flight. */
	readonly busy: boolean;
	/** Schedule a rebuild against the latest `chunks` snapshot. Bursts
	 *  within the debounce window collapse into a single rebuild that
	 *  uses the LAST snapshot passed (not the first). */
	requestRebuild(input: NavMeshBuildInput): void;
	/** Force-flush any queued rebuild and await it. Useful at floor
	 *  transitions (player takes a door) so the next tick has a fresh
	 *  navmesh. */
	flush(): Promise<void>;
	/** Stop accepting requests; cancel any pending timer. */
	stop(): void;
}

export function createNavMeshHost(opts: NavMeshHostOptions = {}): NavMeshHost {
	const debounceMs = opts.debounceMs ?? 100;
	const buildFn = opts.buildFn ?? ((input) => buildNavMesh(input));

	let pendingInput: NavMeshBuildInput | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let inFlight: Promise<void> | null = null;
	let stopped = false;
	let current: NavMesh | null = null;
	let rebuildCount = 0;

	const runBuild = async (): Promise<void> => {
		// Wait for any in-flight build to complete before starting a new
		// one — keeps `current` always pointing at a coherent navmesh.
		if (inFlight) await inFlight;
		const input = pendingInput;
		if (!input || stopped) return;
		pendingInput = null;
		const work = (async () => {
			const result = await Promise.resolve(buildFn(input));
			current = result.navMesh;
			rebuildCount++;
		})();
		inFlight = work;
		try {
			await work;
		} finally {
			inFlight = null;
		}
	};

	return {
		get current() {
			return current;
		},
		get rebuildCount() {
			return rebuildCount;
		},
		get busy() {
			return timer !== null || inFlight !== null;
		},
		requestRebuild(input) {
			if (stopped) return;
			pendingInput = input;
			if (timer) return; // already scheduled; latest input wins
			timer = setTimeout(() => {
				timer = null;
				void runBuild();
			}, debounceMs);
		},
		async flush() {
			if (timer) {
				clearTimeout(timer);
				timer = null;
				await runBuild();
				return;
			}
			if (inFlight) await inFlight;
		},
		stop() {
			stopped = true;
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			pendingInput = null;
		},
	};
}

export type { ChunkData, NavMeshBuildInput };
