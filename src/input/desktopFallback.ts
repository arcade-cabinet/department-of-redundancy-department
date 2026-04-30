/**
 * Desktop keyboard fallback (spec §5): WASD overrides current path-target,
 * Escape pauses, Shift focus-fire toggle. The mouse path goes through
 * <InputCanvas/> which already handles desktop pointer events as
 * gestures. This module subscribes to global key events and emits to
 * a callback bus.
 *
 * Uses pull-flag semantics: WASD emits a continuous direction vector,
 * not discrete events, so the player kinematic controller (PRQ-05 T3)
 * reads `getDirection()` per tick and overrides the path-follower.
 *
 * Designed for clean teardown: subscribeKeyboard() returns an unsubscribe
 * fn that the React effect calls in cleanup. Multiple subscribers fan
 * out via the shared callback list.
 */

export interface DirectionVector {
	x: -1 | 0 | 1; // -1 = west (A), 1 = east (D)
	z: -1 | 0 | 1; // -1 = north (W), 1 = south (S)
}

export interface DesktopFallback {
	getDirection(): DirectionVector;
	dispose(): void;
}

export interface DesktopBusEvents {
	pause(): void;
	focusFireToggle(): void;
}

export function subscribeKeyboard(events: Partial<DesktopBusEvents> = {}): DesktopFallback {
	const dir: DirectionVector = { x: 0, z: 0 };
	// Track which keys are currently held so that releasing W while S is
	// still pressed correctly leaves z=1 instead of z=0.
	const held = new Set<string>();

	const recompute = (): void => {
		dir.x = ((held.has('KeyD') ? 1 : 0) + (held.has('KeyA') ? -1 : 0)) as -1 | 0 | 1;
		dir.z = ((held.has('KeyS') ? 1 : 0) + (held.has('KeyW') ? -1 : 0)) as -1 | 0 | 1;
	};

	const onDown = (e: KeyboardEvent) => {
		if (e.repeat) return; // browsers fire keydown for held keys; ignore the auto-repeats
		switch (e.code) {
			case 'KeyW':
			case 'KeyA':
			case 'KeyS':
			case 'KeyD':
				held.add(e.code);
				recompute();
				break;
			case 'Escape':
				events.pause?.();
				break;
			case 'ShiftLeft':
			case 'ShiftRight':
				events.focusFireToggle?.();
				break;
		}
	};
	const onUp = (e: KeyboardEvent) => {
		if (held.has(e.code)) {
			held.delete(e.code);
			recompute();
		}
	};

	const target =
		typeof window !== 'undefined'
			? window
			: ({ addEventListener: () => {}, removeEventListener: () => {} } as Pick<
					Window,
					'addEventListener' | 'removeEventListener'
				>);

	target.addEventListener('keydown', onDown as EventListener);
	target.addEventListener('keyup', onUp as EventListener);

	return {
		getDirection: () => ({ x: dir.x, z: dir.z }),
		dispose() {
			target.removeEventListener('keydown', onDown as EventListener);
			target.removeEventListener('keyup', onUp as EventListener);
			held.clear();
			dir.x = 0;
			dir.z = 0;
		},
	};
}
