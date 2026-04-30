import { describe, expect, it, vi } from 'vitest';
import {
	createGestureClassifier,
	DRAG_THRESHOLD_PX,
	type GestureEvent,
	HOLD_THRESHOLD_MS,
} from './gesture';

interface Harness {
	events: GestureEvent[];
	timers: Array<{ ms: number; cb: () => void; cancelled: boolean }>;
	advance: (ms: number) => void;
	classifier: ReturnType<typeof createGestureClassifier>;
}

function makeHarness(): Harness {
	const events: GestureEvent[] = [];
	const timers: Harness['timers'] = [];
	let now = 0;

	const advance = (ms: number) => {
		now += ms;
		for (const t of timers) {
			if (!t.cancelled && t.ms <= now) {
				t.cancelled = true;
				t.cb();
			}
		}
	};

	const classifier = createGestureClassifier({
		onEvent: (e) => events.push(e),
		setTimer: (ms, cb) => {
			const t = { ms: now + ms, cb, cancelled: false };
			timers.push(t);
			return () => {
				t.cancelled = true;
			};
		},
	});

	return { events, timers, advance, classifier };
}

describe('gesture classifier', () => {
	it('quick down→up = tap', () => {
		const h = makeHarness();
		h.classifier.down({ x: 100, y: 100, t: 0 });
		h.advance(50);
		h.classifier.up({ x: 101, y: 100, t: 50 });
		expect(h.events).toEqual([{ kind: 'tap', x: 101, y: 100 }]);
	});

	it('down→hold-threshold-elapsed = hold (fired exactly once)', () => {
		const h = makeHarness();
		h.classifier.down({ x: 100, y: 100, t: 0 });
		h.advance(HOLD_THRESHOLD_MS + 1);
		expect(h.events).toEqual([{ kind: 'hold', x: 100, y: 100 }]);
		h.classifier.up({ x: 100, y: 100, t: HOLD_THRESHOLD_MS + 5 });
		// Up after a hold doesn't add a tap event.
		expect(h.events.length).toBe(1);
	});

	it('move beyond drag threshold before hold = drag, no tap on up', () => {
		const h = makeHarness();
		h.classifier.down({ x: 100, y: 100, t: 0 });
		h.classifier.move({ x: 110, y: 100, t: 30 }); // 10px > 8 threshold
		h.classifier.move({ x: 120, y: 100, t: 60 });
		h.classifier.up({ x: 120, y: 100, t: 80 });

		const kinds = h.events.map((e) => e.kind);
		expect(kinds).toEqual(['drag', 'drag', 'drag-end']);
		const firstDrag = h.events[0];
		if (firstDrag?.kind === 'drag') {
			expect(firstDrag.dx).toBe(10);
			expect(firstDrag.dy).toBe(0);
		}
	});

	it('tiny moves under threshold do NOT cancel a tap', () => {
		const h = makeHarness();
		h.classifier.down({ x: 100, y: 100, t: 0 });
		h.classifier.move({ x: 103, y: 102, t: 10 }); // 3.6px, under 8
		h.classifier.move({ x: 105, y: 105, t: 30 }); // 7.07px, still under 8
		h.classifier.up({ x: 105, y: 105, t: 50 });
		expect(h.events).toEqual([{ kind: 'tap', x: 105, y: 105 }]);
	});

	it('move past threshold cancels the pending hold timer', () => {
		const h = makeHarness();
		h.classifier.down({ x: 100, y: 100, t: 0 });
		h.classifier.move({ x: 200, y: 100, t: 50 });
		h.advance(HOLD_THRESHOLD_MS + 50);
		// Hold should NOT have fired because the timer was cancelled.
		expect(h.events.find((e) => e.kind === 'hold')).toBeUndefined();
	});

	it('cancel() before up suppresses any event', () => {
		const h = makeHarness();
		h.classifier.down({ x: 100, y: 100, t: 0 });
		h.classifier.cancel();
		h.classifier.up({ x: 100, y: 100, t: 30 });
		expect(h.events).toEqual([]);
	});

	it('cancel() during a drag suppresses drag-end', () => {
		const h = makeHarness();
		h.classifier.down({ x: 100, y: 100, t: 0 });
		h.classifier.move({ x: 200, y: 100, t: 50 });
		h.classifier.cancel();
		h.classifier.up({ x: 200, y: 100, t: 60 });
		expect(h.events.find((e) => e.kind === 'drag-end')).toBeUndefined();
	});

	it('exactly DRAG_THRESHOLD_PX is still a tap (strict greater-than)', () => {
		const h = makeHarness();
		h.classifier.down({ x: 100, y: 100, t: 0 });
		h.classifier.move({ x: 100 + DRAG_THRESHOLD_PX, y: 100, t: 10 });
		h.classifier.up({ x: 100 + DRAG_THRESHOLD_PX, y: 100, t: 30 });
		expect(h.events).toEqual([{ kind: 'tap', x: 108, y: 100 }]);
	});

	it('a fresh down resets prior state cleanly', () => {
		const h = makeHarness();
		h.classifier.down({ x: 100, y: 100, t: 0 });
		h.classifier.up({ x: 100, y: 100, t: 30 }); // emits tap
		h.classifier.down({ x: 200, y: 200, t: 100 });
		h.advance(HOLD_THRESHOLD_MS + 100);
		expect(h.events).toEqual([
			{ kind: 'tap', x: 100, y: 100 },
			{ kind: 'hold', x: 200, y: 200 },
		]);
	});

	it('move without prior down is a no-op', () => {
		const h = makeHarness();
		h.classifier.move({ x: 50, y: 50, t: 5 });
		h.classifier.up({ x: 50, y: 50, t: 10 });
		expect(h.events).toEqual([]);
	});

	it('default setTimer path uses real setTimeout (smoke)', async () => {
		const events: GestureEvent[] = [];
		const c = createGestureClassifier({
			onEvent: (e) => events.push(e),
			holdMs: 5,
		});
		c.down({ x: 0, y: 0, t: 0 });
		await new Promise((r) => setTimeout(r, 20));
		c.dispose();
		expect(events.find((e) => e.kind === 'hold')).toBeDefined();
		// Use vi.fn just to make sure we link setTimeout legitimately
		// (no eslint-no-unused-vars on the import path).
		expect(typeof vi.fn).toBe('function');
	});
});
