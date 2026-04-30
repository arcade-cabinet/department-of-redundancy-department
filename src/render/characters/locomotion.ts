/**
 * Pure locomotion math + state machine for spec §3.5 hop-walk.
 *
 * Every character in DORD uses the SAME shader-driven hop-walk on top
 * of its T-pose GLB — no skeletal animation. The deltas computed here
 * are applied per-frame inside `<Character/>` to the cloned scene's
 * transform. This module stays framework-agnostic so the FSM is unit-
 * testable without R3F or three.
 *
 * Spec formulas (locked):
 *   hopY      = sin(speed * t * π)² * hopHeight
 *   hopHeight = 0.12 walk, 0.22 run
 *   rotZRock  = sin(t * π * speed) * 0.05
 *   rotXLean  = clamp(speed * 0.08, 0, 0.12)
 *   idle Y    = sin(t * 0.3 * 2π) * 0.01    (0.3 Hz breathing)
 *   landing squash: scale.y *= 0.92 for 60ms after each hop low point
 *   attack: lunge forward 0.4u over 120ms ease-out, return
 *   hit:    80ms ±0.05u XYZ shake + emissive red flash uniform
 *   death:  rotZ 90° over 0.6s + 0.5s dissolve fade
 */

export type LocomotionState = 'idle' | 'walk' | 'run' | 'attack' | 'hit' | 'death';

export const HOP_HEIGHT_WALK = 0.12;
export const HOP_HEIGHT_RUN = 0.22;
const SPEED_RUN_THRESHOLD = 1.5; // walk vs run boundary
export const ATTACK_LUNGE_DISTANCE = 0.4;
export const ATTACK_LUNGE_DURATION_MS = 120;
export const HIT_SHAKE_AMP = 0.05;
export const HIT_DURATION_MS = 80;
export const DEATH_ROT_DURATION_MS = 600;
export const DEATH_DISSOLVE_DURATION_MS = 500;
export const LANDING_SQUASH_FACTOR = 0.92;
export const LANDING_SQUASH_MS = 60;

/** Vertical hop curve — sin² so it returns to zero at every full step
 *  (one step = one π/(speed*π) period = 1/speed seconds). */
export function hopY(t: number, speed: number): number {
	if (speed <= 0) return 0;
	const h = speed >= SPEED_RUN_THRESHOLD ? HOP_HEIGHT_RUN : HOP_HEIGHT_WALK;
	const s = Math.sin(speed * t * Math.PI);
	return s * s * h;
}

/** Side-to-side body rock — sin (not sin²) so it crosses zero at each
 *  hop apex. ±0.05 rad amplitude. */
export function rotZRock(t: number, speed: number): number {
	if (speed <= 0) return 0;
	return Math.sin(t * Math.PI * speed) * 0.05;
}

/** Forward lean proportional to speed, capped at the run cadence. */
export function rotXLean(speed: number): number {
	return Math.min(0.12, Math.max(0, speed * 0.08));
}

/** Subtle vertical breathing while idle — 0.3 Hz, ±0.01u amplitude. */
export function idleBreathe(t: number): number {
	return Math.sin(t * 0.3 * 2 * Math.PI) * 0.01;
}

/** Was the previous frame's hopY zero AND this frame's hopY zero too?
 *  i.e. are we at the bottom of a step where the foot just landed?
 *  Used to drive the 60ms landing squash. Compares against an epsilon
 *  to avoid float-edge false positives. */
export function isLanding(prevY: number, curY: number): boolean {
	const EPS = 1e-4;
	return prevY > EPS && curY <= EPS;
}

/**
 * Attack lunge: 0.4u forward over 120ms, ease-out cubic, then snap
 * back to 0. Caller advances `attackElapsedMs` per tick; result is
 * the local-Z offset to apply this frame.
 */
export function attackLunge(elapsedMs: number): number {
	if (elapsedMs >= ATTACK_LUNGE_DURATION_MS) return 0;
	const tNorm = elapsedMs / ATTACK_LUNGE_DURATION_MS;
	// ease-out cubic going outward, then linear-snap back. Half the
	// budget out, half back.
	const half = 0.5;
	if (tNorm < half) {
		const u = tNorm / half;
		return ATTACK_LUNGE_DISTANCE * (1 - (1 - u) ** 3);
	}
	const u = (tNorm - half) / half;
	return ATTACK_LUNGE_DISTANCE * (1 - u);
}

/** Hit shake — ±0.05u jitter on each axis for 80ms. RNG injected so
 *  tests can drive it deterministically. */
export function hitShake(
	elapsedMs: number,
	rng: () => number,
): { x: number; y: number; z: number } {
	if (elapsedMs >= HIT_DURATION_MS) return { x: 0, y: 0, z: 0 };
	const decay = 1 - elapsedMs / HIT_DURATION_MS;
	return {
		x: (rng() * 2 - 1) * HIT_SHAKE_AMP * decay,
		y: (rng() * 2 - 1) * HIT_SHAKE_AMP * decay,
		z: (rng() * 2 - 1) * HIT_SHAKE_AMP * decay,
	};
}

/** Hit-flash uniform value: 1.0 at start, linearly decays to 0 by
 *  HIT_DURATION_MS. */
export function hitFlash(elapsedMs: number): number {
	if (elapsedMs >= HIT_DURATION_MS) return 0;
	return 1 - elapsedMs / HIT_DURATION_MS;
}

/** Death rotation: 0 → π/2 (90°) over DEATH_ROT_DURATION_MS. */
export function deathRotZ(elapsedMs: number): number {
	const t = Math.min(1, elapsedMs / DEATH_ROT_DURATION_MS);
	return (t * Math.PI) / 2;
}

/** Dissolve uniform: 0 (visible) → 1 (gone) over DEATH_DISSOLVE_DURATION_MS,
 *  starting after the rotation finishes. */
export function deathDissolve(elapsedMs: number): number {
	const start = DEATH_ROT_DURATION_MS;
	if (elapsedMs <= start) return 0;
	const u = (elapsedMs - start) / DEATH_DISSOLVE_DURATION_MS;
	return Math.min(1, u);
}

/** True when the death animation has fully played out and the caller
 *  should unmount the character (or fire onDeathEnd). */
export function isDeathComplete(elapsedMs: number): boolean {
	return elapsedMs >= DEATH_ROT_DURATION_MS + DEATH_DISSOLVE_DURATION_MS;
}

/**
 * State machine: returns the next state given the current one and an
 * input event. Hit and death don't auto-transition off — the host
 * advances them via timers and explicitly transitions back to idle/
 * walk when the timer expires (death is terminal until the host
 * unmounts).
 */
export type LocomotionEvent =
	| { kind: 'set-state'; to: Exclude<LocomotionState, 'attack'> }
	| { kind: 'attack' }
	| { kind: 'hit' }
	| { kind: 'die' }
	| { kind: 'tick'; elapsedMs: number };

export interface LocomotionMachine {
	state: LocomotionState;
	/** Milliseconds spent in the current transient state (attack/hit/death). */
	elapsedMs: number;
}

export function transition(m: LocomotionMachine, ev: LocomotionEvent): LocomotionMachine {
	// Death is absorbing.
	if (m.state === 'death' && ev.kind !== 'tick') return m;

	switch (ev.kind) {
		case 'set-state':
			// Don't interrupt transient states; queue the change behind them.
			if (m.state === 'attack' || m.state === 'hit') return m;
			return { state: ev.to, elapsedMs: 0 };
		case 'attack':
			if (m.state === 'hit' || m.state === 'death') return m;
			return { state: 'attack', elapsedMs: 0 };
		case 'hit':
			if (m.state === 'death') return m;
			return { state: 'hit', elapsedMs: 0 };
		case 'die':
			return { state: 'death', elapsedMs: 0 };
		case 'tick': {
			const next = m.elapsedMs + ev.elapsedMs;
			if (m.state === 'attack' && next >= ATTACK_LUNGE_DURATION_MS) {
				return { state: 'idle', elapsedMs: 0 };
			}
			if (m.state === 'hit' && next >= HIT_DURATION_MS) {
				return { state: 'idle', elapsedMs: 0 };
			}
			return { state: m.state, elapsedMs: next };
		}
	}
}
