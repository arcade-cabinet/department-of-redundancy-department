import { useEffect, useRef } from 'react';
import { createGestureClassifier, type GestureEvent } from './gesture';

type Props = {
	/** Called for every classified gesture (tap / hold / drag / drag-end).
	 *  The host component is responsible for translating the screen-space
	 *  coordinates into world-space (raycast against the chunk BVH) — this
	 *  component stays renderer-agnostic so unit tests can drive it without
	 *  R3F. */
	onGesture: (event: GestureEvent) => void;
	/** Optional override for hold/drag thresholds (testing). */
	holdMs?: number;
	dragPx?: number;
	/** Whether to capture pointer events. Useful to disable while a modal
	 *  (pause menu, radial menu) is open and should swallow gestures. */
	enabled?: boolean;
};

/**
 * Transparent overlay that captures pointer events on top of the R3F
 * `<Canvas/>`. Pumps raw events through the gesture classifier and
 * fires `onGesture` for each classified gesture.
 *
 * Why a separate `<div>` rather than R3F's built-in pointer events:
 * R3F's events fire only on meshes (raycast hits). Tap-to-travel must
 * accept "tap on empty space" too — the overlay sees the raw screen
 * coords, the host's onGesture handler does the world raycast.
 *
 * Pointer events (vs. touch + mouse) unify desktop + mobile under one
 * code path. iOS Safari 14+ supports them; older shells fall through
 * to the touch-event polyfill mentioned in spec §2 (Capacitor 8 ships
 * a fresh-enough WebKit).
 */
export function InputCanvas({ onGesture, holdMs, dragPx, enabled = true }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const onGestureRef = useRef(onGesture);
	onGestureRef.current = onGesture;

	useEffect(() => {
		const el = ref.current;
		if (!el || !enabled) return;
		const classifier = createGestureClassifier({
			onEvent: (e) => onGestureRef.current(e),
			...(holdMs !== undefined && { holdMs }),
			...(dragPx !== undefined && { dragPx }),
		});

		// Track active pointers so a multi-touch (player accidentally
		// pinches) doesn't confuse the classifier — only the *first*
		// pointer counts; subsequent ones are ignored until release.
		let activePointer: number | null = null;

		const localCoords = (ev: PointerEvent): { x: number; y: number } => {
			const rect = el.getBoundingClientRect();
			return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
		};

		const onDown = (ev: PointerEvent) => {
			if (activePointer !== null) return;
			activePointer = ev.pointerId;
			el.setPointerCapture(ev.pointerId);
			const { x, y } = localCoords(ev);
			classifier.down({ x, y, t: ev.timeStamp });
		};
		const onMove = (ev: PointerEvent) => {
			if (ev.pointerId !== activePointer) return;
			const { x, y } = localCoords(ev);
			classifier.move({ x, y, t: ev.timeStamp });
		};
		const onUp = (ev: PointerEvent) => {
			if (ev.pointerId !== activePointer) return;
			const { x, y } = localCoords(ev);
			classifier.up({ x, y, t: ev.timeStamp });
			el.releasePointerCapture(ev.pointerId);
			activePointer = null;
		};
		const onCancel = (ev: PointerEvent) => {
			if (ev.pointerId !== activePointer) return;
			classifier.cancel();
			el.releasePointerCapture(ev.pointerId);
			activePointer = null;
		};

		el.addEventListener('pointerdown', onDown);
		el.addEventListener('pointermove', onMove);
		el.addEventListener('pointerup', onUp);
		el.addEventListener('pointercancel', onCancel);
		// iOS Safari fires `lostpointercapture` instead of pointercancel
		// when scrolling steals the pointer (rare under our touch-action
		// none, but be safe).
		el.addEventListener('lostpointercapture', onCancel);

		return () => {
			classifier.dispose();
			el.removeEventListener('pointerdown', onDown);
			el.removeEventListener('pointermove', onMove);
			el.removeEventListener('pointerup', onUp);
			el.removeEventListener('pointercancel', onCancel);
			el.removeEventListener('lostpointercapture', onCancel);
		};
	}, [enabled, holdMs, dragPx]);

	return (
		<div
			ref={ref}
			data-testid="input-canvas"
			style={{
				position: 'absolute',
				inset: 0,
				touchAction: 'none', // prevent scroll from stealing pointer
				userSelect: 'none',
				pointerEvents: enabled ? 'auto' : 'none',
				background: 'transparent',
			}}
		/>
	);
}
