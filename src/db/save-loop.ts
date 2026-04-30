import type { Db } from './repos/types';

/**
 * Debounced batched save loop. Spec §8.4: enqueue writes from the
 * game's koota world, batch-flush every 1s OR on `pagehide` /
 * `blur` / Capacitor `appStateChange`. Single transaction per flush.
 *
 * The loop here is framework-agnostic — it accepts an opaque
 * `WriteFn` callback that does the actual DB work inside a
 * transaction. The koota bridge (PRQ-06+, src/ecs/save-bridge.ts)
 * will pump component changes into `enqueue()`. For PRQ-04 T8 we ship
 * the primitive + lifecycle wiring + tests.
 *
 * Why a queue not direct writes: chunk dirty events fire dozens of
 * times per second when the player mines a wall. Writing each one is
 * thousands of needless transactions. Batching to 1s collapses them
 * into a single coherent save.
 */

export type WriteFn = (db: Db) => Promise<void>;

export interface SaveLoopHandle {
	enqueue(writer: WriteFn): void;
	flush(): Promise<void>;
	stop(): void;
	/** Test-only: number of writers currently buffered. */
	readonly queued: number;
}

export interface SaveLoopOptions {
	/** Idle debounce window before an automatic flush. Default 1000ms. */
	debounceMs?: number;
	/** Override the lifecycle subscription (test injection). When omitted,
	 *  the loop attaches to `window.pagehide` + `window.blur` if running
	 *  in a browser; in node/test it skips. */
	subscribeLifecycle?: (onTrigger: () => void) => () => void;
}

export function startSaveLoop(db: Db, opts: SaveLoopOptions = {}): SaveLoopHandle {
	const debounceMs = opts.debounceMs ?? 1000;
	const subscribe = opts.subscribeLifecycle ?? defaultLifecycle;

	let queue: WriteFn[] = [];
	let timer: ReturnType<typeof setTimeout> | null = null;
	let inFlight: Promise<void> | null = null;
	let stopped = false;

	const fireFlush = async (): Promise<void> => {
		if (inFlight) await inFlight;
		if (queue.length === 0) return;
		const batch = queue;
		queue = [];
		const work = (async () => {
			for (const w of batch) {
				try {
					await w(db);
				} catch (err) {
					console.error('save-loop: writer failed:', err);
				}
			}
		})();
		inFlight = work;
		try {
			await work;
		} finally {
			inFlight = null;
		}
	};

	const scheduleFlush = (): void => {
		if (stopped) return;
		if (timer) return;
		timer = setTimeout(() => {
			timer = null;
			void fireFlush().catch((err) => {
				console.error('save-loop: scheduled flush failed:', err);
			});
		}, debounceMs);
	};

	const onLifecycleTrigger = (): void => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		void fireFlush();
	};

	const unsubscribe = subscribe(onLifecycleTrigger);

	return {
		enqueue(writer) {
			if (stopped) return;
			queue.push(writer);
			scheduleFlush();
		},
		flush() {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			return fireFlush();
		},
		stop() {
			stopped = true;
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			unsubscribe();
		},
		get queued() {
			return queue.length;
		},
	};
}

function defaultLifecycle(onTrigger: () => void): () => void {
	if (typeof window === 'undefined') return () => {};
	window.addEventListener('pagehide', onTrigger);
	window.addEventListener('blur', onTrigger);
	return () => {
		window.removeEventListener('pagehide', onTrigger);
		window.removeEventListener('blur', onTrigger);
	};
}
