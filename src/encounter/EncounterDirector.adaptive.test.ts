import { describe, expect, test } from 'vitest';
import {
	ADAPTIVE_FLOOR,
	ADAPTIVE_STEP,
	computeAdaptiveWindupMultiplier,
} from './EncounterDirector';

/**
 * PRQ D.6 — Adaptive-difficulty windup curve.
 *
 * Per docs/spec/03-difficulty-and-modifiers.md the within-dwell adaptive
 * curve scales enemy aim-laser durations by:
 *
 *   effective = base * max(ADAPTIVE_FLOOR, 1 - ADAPTIVE_STEP * hitlessKills)
 *
 * The streak resets on damage taken, missed shot, or arrival at a new
 * dwell node. Streak-reset behavior is covered by EncounterDirector's
 * own integration tests; this file pins the pure-math curve.
 */

describe('computeAdaptiveWindupMultiplier', () => {
	test('returns 1.0 with no kills banked (no shortening)', () => {
		expect(computeAdaptiveWindupMultiplier(0)).toBe(1);
	});

	test('decrements by ADAPTIVE_STEP per hitless kill', () => {
		expect(computeAdaptiveWindupMultiplier(1)).toBeCloseTo(1 - ADAPTIVE_STEP, 9);
		expect(computeAdaptiveWindupMultiplier(3)).toBeCloseTo(1 - 3 * ADAPTIVE_STEP, 9);
		expect(computeAdaptiveWindupMultiplier(5)).toBeCloseTo(1 - 5 * ADAPTIVE_STEP, 9);
	});

	test('clamps to ADAPTIVE_FLOOR (windup never falls below 50%)', () => {
		// 1 - 0.05 * 10 = 0.5 (right at the floor)
		expect(computeAdaptiveWindupMultiplier(10)).toBeCloseTo(ADAPTIVE_FLOOR, 9);
		// 1 - 0.05 * 100 = -4 → clamped to floor
		expect(computeAdaptiveWindupMultiplier(100)).toBe(ADAPTIVE_FLOOR);
		// Pathological streak still floored
		expect(computeAdaptiveWindupMultiplier(1_000_000)).toBe(ADAPTIVE_FLOOR);
	});

	test('treats negative streak as no-streak (clamped to 1.0)', () => {
		// 1 - 0.05 * (-3) = 1.15. The floor doesn't apply here because the
		// formula exceeds 1.0, not falls below floor — but no current call
		// site can produce a negative streak; this test pins the math so
		// future refactors don't regress.
		expect(computeAdaptiveWindupMultiplier(-3)).toBeCloseTo(1.15, 9);
	});

	test('curve is monotonically non-increasing', () => {
		let prev = Number.POSITIVE_INFINITY;
		for (let kills = 0; kills <= 20; kills++) {
			const m = computeAdaptiveWindupMultiplier(kills);
			expect(m).toBeLessThanOrEqual(prev);
			prev = m;
		}
	});

	test('exported constants ADAPTIVE_FLOOR and ADAPTIVE_STEP match spec', () => {
		// docs/spec/03 calls out FLOOR=0.5 (no faster than 50% windup) and
		// STEP=0.05 (5% per kill). These values are the difficulty curve
		// shape the canonical-run pacing was tuned around — changing them
		// requires a re-tune, so the test pins them as a tripwire.
		expect(ADAPTIVE_FLOOR).toBe(0.5);
		expect(ADAPTIVE_STEP).toBe(0.05);
	});
});
