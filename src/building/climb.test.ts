import { describe, expect, it } from 'vitest';
import { MAX_CLIMB_STEP, tryClimbStep } from './climb';

describe('climb step', () => {
	it('rejects descending', () => {
		const r = tryClimbStep(2, 1);
		expect(r.allowed).toBe(false);
		expect(r.reason).toBe('descending');
	});

	it('rejects climbs above the max step', () => {
		const r = tryClimbStep(0, MAX_CLIMB_STEP + 0.01);
		expect(r.allowed).toBe(false);
		expect(r.reason).toBe('too-high');
	});

	it('allows up to MAX_CLIMB_STEP', () => {
		const r = tryClimbStep(0, MAX_CLIMB_STEP);
		expect(r.allowed).toBe(true);
		expect(r.deltaY).toBe(MAX_CLIMB_STEP);
	});

	it('returns the delta', () => {
		const r = tryClimbStep(0.8, 1.6);
		expect(r.allowed).toBe(true);
		expect(r.deltaY).toBeCloseTo(0.8, 5);
	});
});
