import { describe, expect, it } from 'vitest';
import { Vector3 } from 'yuka';
import { createRng } from '@/world/generator/rng';
import { applyHitscanSpread, MAX_SPREAD_DEG, MAX_SPREAD_RAD } from './hitscan';

const FORWARD = new Vector3(1, 0, 0);
const ORIGIN = new Vector3(0, 0, 0);

describe('hitscan spread', () => {
	it('accuracy=1 → exact aim (no rotation)', () => {
		const rng = createRng('test');
		const r = applyHitscanSpread({ origin: ORIGIN, direction: FORWARD, accuracy: 1, rng });
		expect(r.direction.x).toBeCloseTo(1, 6);
		expect(r.direction.y).toBeCloseTo(0, 6);
		expect(r.direction.z).toBeCloseTo(0, 6);
	});

	it('accuracy=0 → spread bounded by MAX_SPREAD_RAD half-angle', () => {
		const rng = createRng('test-spread');
		for (let i = 0; i < 50; i++) {
			const r = applyHitscanSpread({ origin: ORIGIN, direction: FORWARD, accuracy: 0, rng });
			// Angle from FORWARD = acos(dot).
			const dot = r.direction.x * 1 + r.direction.y * 0 + r.direction.z * 0;
			const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
			expect(angle).toBeLessThanOrEqual(MAX_SPREAD_RAD + 1e-6);
		}
	});

	it('accuracy=0.6 → spread bounded by 0.4 × MAX_SPREAD_RAD', () => {
		const rng = createRng('test-acc-0.6');
		const halfAngle = 0.4 * MAX_SPREAD_RAD;
		for (let i = 0; i < 50; i++) {
			const r = applyHitscanSpread({
				origin: ORIGIN,
				direction: FORWARD,
				accuracy: 0.6,
				rng,
			});
			const dot = r.direction.x * 1;
			const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
			expect(angle).toBeLessThanOrEqual(halfAngle + 1e-6);
		}
	});

	it('result direction is unit length', () => {
		const rng = createRng('test-unit');
		const r = applyHitscanSpread({ origin: ORIGIN, direction: FORWARD, accuracy: 0.5, rng });
		const len = Math.hypot(r.direction.x, r.direction.y, r.direction.z);
		expect(len).toBeCloseTo(1, 6);
	});

	it('handles aim straight up (Y axis) without singularity', () => {
		const rng = createRng('test-up');
		const upDir = new Vector3(0, 1, 0);
		const r = applyHitscanSpread({ origin: ORIGIN, direction: upDir, accuracy: 0.5, rng });
		expect(r.direction.y).toBeGreaterThan(0); // still mostly upward
		const len = Math.hypot(r.direction.x, r.direction.y, r.direction.z);
		expect(len).toBeCloseTo(1, 6);
	});

	it('sanity: MAX_SPREAD_DEG → MAX_SPREAD_RAD conversion', () => {
		expect(MAX_SPREAD_RAD).toBeCloseTo((MAX_SPREAD_DEG * Math.PI) / 180, 8);
	});
});
