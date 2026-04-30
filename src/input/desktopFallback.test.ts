import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeKeyboard } from './desktopFallback';

/**
 * Mock the window event surface. `subscribeKeyboard` reads `window`
 * if it exists; in node it sees `undefined` and falls back to the
 * no-op stub. Stub it so we can dispatch events.
 */
let listeners: Map<string, Set<EventListener>>;
let originalWindow: typeof window | undefined;

function installFakeWindow(): { dispatch: (type: string, e: KeyboardEvent) => void } {
	listeners = new Map();
	originalWindow = (globalThis as { window?: typeof window }).window;
	const fakeWindow: Pick<typeof window, 'addEventListener' | 'removeEventListener'> = {
		addEventListener: ((type: string, listener: EventListener) => {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type)?.add(listener);
		}) as typeof window.addEventListener,
		removeEventListener: ((type: string, listener: EventListener) => {
			listeners.get(type)?.delete(listener);
		}) as typeof window.removeEventListener,
	};
	(globalThis as { window?: unknown }).window = fakeWindow;

	return {
		dispatch(type: string, e: KeyboardEvent) {
			for (const l of listeners.get(type) ?? []) l(e);
		},
	};
}

function restoreWindow(): void {
	if (originalWindow === undefined) {
		(globalThis as { window?: unknown }).window = undefined;
	} else {
		(globalThis as { window?: typeof window }).window = originalWindow;
	}
}

const k = (code: string, repeat = false): KeyboardEvent => ({ code, repeat }) as KeyboardEvent;

describe('desktopFallback', () => {
	let h: { dispatch: (type: string, e: KeyboardEvent) => void };
	beforeEach(() => {
		h = installFakeWindow();
	});
	afterEach(() => {
		restoreWindow();
	});

	it('WASD updates direction vector with cardinal mapping', () => {
		const fb = subscribeKeyboard();
		expect(fb.getDirection()).toEqual({ x: 0, z: 0 });
		h.dispatch('keydown', k('KeyW'));
		expect(fb.getDirection()).toEqual({ x: 0, z: -1 });
		h.dispatch('keydown', k('KeyD'));
		expect(fb.getDirection()).toEqual({ x: 1, z: -1 });
		h.dispatch('keyup', k('KeyW'));
		expect(fb.getDirection()).toEqual({ x: 1, z: 0 });
		fb.dispose();
	});

	it('opposing keys cancel out (W + S = 0)', () => {
		const fb = subscribeKeyboard();
		h.dispatch('keydown', k('KeyW'));
		h.dispatch('keydown', k('KeyS'));
		expect(fb.getDirection()).toEqual({ x: 0, z: 0 });
		fb.dispose();
	});

	it('keydown auto-repeats are ignored (avoid duplicate counts)', () => {
		const fb = subscribeKeyboard();
		h.dispatch('keydown', k('KeyW'));
		h.dispatch('keydown', k('KeyW', true)); // repeat
		// Without the repeat guard the held set would still hold 'KeyW'
		// only once because Set is idempotent — but the guard guarantees
		// we don't call recompute() per repeat (perf).
		expect(fb.getDirection()).toEqual({ x: 0, z: -1 });
		fb.dispose();
	});

	it('Escape fires pause callback', () => {
		const pause = vi.fn();
		const fb = subscribeKeyboard({ pause });
		h.dispatch('keydown', k('Escape'));
		expect(pause).toHaveBeenCalledTimes(1);
		fb.dispose();
	});

	it('Shift fires focus-fire toggle', () => {
		const focusFireToggle = vi.fn();
		const fb = subscribeKeyboard({ focusFireToggle });
		h.dispatch('keydown', k('ShiftLeft'));
		h.dispatch('keydown', k('ShiftRight'));
		expect(focusFireToggle).toHaveBeenCalledTimes(2);
		fb.dispose();
	});

	it('dispose removes listeners and zeros direction', () => {
		const fb = subscribeKeyboard();
		h.dispatch('keydown', k('KeyD'));
		expect(fb.getDirection()).toEqual({ x: 1, z: 0 });
		fb.dispose();
		expect(fb.getDirection()).toEqual({ x: 0, z: 0 });
		// Subsequent events ignored — listeners were detached.
		h.dispatch('keydown', k('KeyW'));
		expect(fb.getDirection()).toEqual({ x: 0, z: 0 });
	});

	it('non-game keys are ignored', () => {
		const fb = subscribeKeyboard();
		h.dispatch('keydown', k('KeyQ'));
		h.dispatch('keydown', k('Tab'));
		expect(fb.getDirection()).toEqual({ x: 0, z: 0 });
		fb.dispose();
	});
});
