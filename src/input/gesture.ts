/**
 * Gesture classifier — pure state machine over pointer events.
 *
 * Per spec §5 input model:
 *   down → up within 220ms AND move ≤ 8px → tap
 *   down → 220ms elapsed AND move ≤ 8px → hold (fires once at the threshold)
 *   down → move > 8px before 220ms → drag (continues firing per move)
 *
 * The classifier is framework-agnostic: callers feed pointer events
 * (down/move/up/cancel) plus a clock-tick callback (browsers via
 * `setTimeout`, tests via fake timers). All decisions are emitted via
 * the `onEvent` callback, which keeps the classifier testable without
 * a DOM.
 *
 * One classifier instance per pointer (touch vs mouse). The hold timer
 * is started on `down` and cleared on any of: move-past-threshold, up,
 * cancel.
 */

export const HOLD_THRESHOLD_MS = 220;
export const DRAG_THRESHOLD_PX = 8;

export type GestureEvent =
	| { kind: 'tap'; x: number; y: number }
	| { kind: 'hold'; x: number; y: number }
	| { kind: 'drag'; x: number; y: number; dx: number; dy: number }
	| { kind: 'drag-end'; x: number; y: number };

export interface PointerSample {
	x: number;
	y: number;
	t: number;
}

export interface GestureClassifier {
	down(p: PointerSample): void;
	move(p: PointerSample): void;
	up(p: PointerSample): void;
	cancel(): void;
	dispose(): void;
}

export interface ClassifierConfig {
	onEvent: (e: GestureEvent) => void;
	/** Schedule a callback after `ms`. Returns a cancel handle. Defaults to
	 *  setTimeout/clearTimeout; tests inject fake timers. */
	setTimer?: (ms: number, cb: () => void) => () => void;
	/** Override thresholds for tests. */
	holdMs?: number;
	dragPx?: number;
}

export function createGestureClassifier(config: ClassifierConfig): GestureClassifier {
	const onEvent = config.onEvent;
	const holdMs = config.holdMs ?? HOLD_THRESHOLD_MS;
	const dragPx = config.dragPx ?? DRAG_THRESHOLD_PX;
	const setTimer = config.setTimer ?? defaultTimer;

	let downAt: PointerSample | null = null;
	let lastMove: PointerSample | null = null;
	let holdCancel: (() => void) | null = null;
	let dragging = false;
	let holdFired = false;

	const reset = (): void => {
		downAt = null;
		lastMove = null;
		dragging = false;
		holdFired = false;
		if (holdCancel) {
			holdCancel();
			holdCancel = null;
		}
	};

	return {
		down(p) {
			reset();
			downAt = p;
			lastMove = p;
			holdCancel = setTimer(holdMs, () => {
				// Hold only fires if the gesture hasn't graduated to a drag
				// or already been released.
				if (!downAt || dragging) return;
				holdFired = true;
				const ref = downAt;
				onEvent({ kind: 'hold', x: ref.x, y: ref.y });
			});
		},
		move(p) {
			if (!downAt) return;
			const dist = Math.hypot(p.x - downAt.x, p.y - downAt.y);
			if (!dragging && dist > dragPx && !holdFired) {
				dragging = true;
				if (holdCancel) {
					holdCancel();
					holdCancel = null;
				}
			}
			if (dragging) {
				const prev = lastMove ?? downAt;
				onEvent({
					kind: 'drag',
					x: p.x,
					y: p.y,
					dx: p.x - prev.x,
					dy: p.y - prev.y,
				});
			}
			lastMove = p;
		},
		up(p) {
			if (!downAt) {
				reset();
				return;
			}
			if (dragging) {
				onEvent({ kind: 'drag-end', x: p.x, y: p.y });
			} else if (!holdFired) {
				// Move-distance still under threshold AND hold timer never
				// fired → it's a tap.
				onEvent({ kind: 'tap', x: p.x, y: p.y });
			}
			// If holdFired without a drag, the hold event already fired on
			// the timer; the up is just the gesture release, not a new event.
			reset();
		},
		cancel() {
			reset();
		},
		dispose() {
			reset();
		},
	};
}

function defaultTimer(ms: number, cb: () => void): () => void {
	const id = setTimeout(cb, ms);
	return () => clearTimeout(id);
}
