import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTestDb } from './repos/_testdb';
import * as chunks from './repos/chunks';
import type { Db } from './repos/types';
import { startSaveLoop } from './save-loop';

let db: Db;
let close: () => void;

beforeEach(async () => {
	const t = await makeTestDb();
	db = t.db;
	close = t.close;
	vi.useFakeTimers();
});

afterEach(() => {
	close();
	vi.useRealTimers();
});

describe('save-loop', () => {
	it('debounces multiple enqueues into a single flush', async () => {
		const lifecycle = vi.fn(() => () => {});
		const loop = startSaveLoop(db, { debounceMs: 1000, subscribeLifecycle: lifecycle });

		for (let i = 0; i < 5; i++) {
			loop.enqueue((d) => chunks.upsert(d, 1, i, 0, new Uint8Array([i])));
		}
		expect(loop.queued).toBe(5);

		// Advance just under the window — nothing flushed yet.
		vi.advanceTimersByTime(900);
		expect(loop.queued).toBe(5);

		// Cross the threshold; advanceTimersByTime fires the timer
		// callback synchronously but the inner async batch is still
		// pending. flush() returns whatever batch is in-flight (or
		// kicks off a fresh one if the timer callback already cleared
		// the queue).
		await vi.advanceTimersByTimeAsync(200);
		await loop.flush();

		const rows = await chunks.listForFloor(db, 1);
		expect(rows.length).toBe(5);
		expect(loop.queued).toBe(0);
		loop.stop();
	});

	it('lifecycle trigger flushes immediately', async () => {
		let trigger: () => void = () => {};
		const subscribe = (cb: () => void) => {
			trigger = cb;
			return () => {};
		};
		const loop = startSaveLoop(db, { debounceMs: 60_000, subscribeLifecycle: subscribe });

		loop.enqueue((d) => chunks.upsert(d, 1, 0, 0, new Uint8Array([1])));
		expect(loop.queued).toBe(1);

		// Lifecycle event (e.g., pagehide) should bypass the debounce.
		trigger();
		await loop.flush();

		const rows = await chunks.listForFloor(db, 1);
		expect(rows.length).toBe(1);
		loop.stop();
	});

	it('stop() prevents subsequent enqueues from flushing', async () => {
		const loop = startSaveLoop(db, { debounceMs: 100, subscribeLifecycle: () => () => {} });
		loop.stop();
		loop.enqueue((d) => chunks.upsert(d, 1, 0, 0, new Uint8Array([1])));
		expect(loop.queued).toBe(0);
		vi.advanceTimersByTime(500);
		await loop.flush();
		const rows = await chunks.listForFloor(db, 1);
		expect(rows.length).toBe(0);
	});

	it('one writer failing does not abort the rest of the batch', async () => {
		const loop = startSaveLoop(db, { debounceMs: 100, subscribeLifecycle: () => () => {} });
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		loop.enqueue(() => Promise.reject(new Error('boom')));
		loop.enqueue((d) => chunks.upsert(d, 1, 1, 0, new Uint8Array([1])));
		vi.advanceTimersByTime(200);
		await loop.flush();
		expect((await chunks.listForFloor(db, 1)).length).toBe(1);
		expect(errSpy).toHaveBeenCalled();
		errSpy.mockRestore();
		loop.stop();
	});
});
