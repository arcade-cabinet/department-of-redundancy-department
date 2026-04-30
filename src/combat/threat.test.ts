import { describe, expect, it } from 'vitest';
import {
	crossedThresholdUp,
	decay,
	FLOOR_ENTER_DELTA,
	IDLE_DECAY_PER_SECOND,
	KILL_DELTAS,
	onFloorEnter,
	onKill,
	tierFor,
} from './threat';

describe('threat scalar', () => {
	it('kill deltas match spec', () => {
		expect(KILL_DELTAS['middle-manager']).toBe(1.0);
		expect(KILL_DELTAS.policeman).toBe(2.0);
		expect(KILL_DELTAS.hitman).toBe(2.5);
		expect(KILL_DELTAS.swat).toBe(3.0);
	});

	it('onKill stacks deltas additively', () => {
		let t = 0;
		t = onKill(t, 'middle-manager');
		t = onKill(t, 'middle-manager');
		t = onKill(t, 'policeman');
		expect(t).toBe(4.0);
	});

	it('threat never goes negative on decay or floor-enter', () => {
		expect(decay(0.1, 60_000)).toBe(0);
		expect(onFloorEnter(0.2)).toBe(0);
	});

	it('idle decay is -0.05 per minute', () => {
		expect(IDLE_DECAY_PER_SECOND).toBeCloseTo(0.05 / 60, 6);
		const t = decay(2, 60); // 60 sec → -0.05
		expect(t).toBeCloseTo(1.95, 5);
	});

	it('floor-enter relief is -0.5', () => {
		expect(FLOOR_ENTER_DELTA).toBe(-0.5);
		expect(onFloorEnter(3)).toBe(2.5);
	});

	it('tierFor matches spec spawn-pool bands', () => {
		expect(tierFor(0)).toBe('low');
		expect(tierFor(1.99)).toBe('low');
		expect(tierFor(2)).toBe('police');
		expect(tierFor(3.99)).toBe('police');
		expect(tierFor(4)).toBe('hitman');
		expect(tierFor(4.99)).toBe('hitman');
		expect(tierFor(5)).toBe('swat');
		expect(tierFor(7.99)).toBe('swat');
		expect(tierFor(8)).toBe('squad');
		expect(tierFor(99)).toBe('squad');
	});

	it('crossedThresholdUp returns the highest crossed threshold', () => {
		expect(crossedThresholdUp(0, 1)).toBeNull();
		expect(crossedThresholdUp(1.5, 2.5)).toBe(2);
		expect(crossedThresholdUp(0, 5)).toBe(5); // crosses 2, 4, 5 (highest)
		expect(crossedThresholdUp(0, 9)).toBe(8); // crosses 2, 4, 5, 8 (highest)
		expect(crossedThresholdUp(5, 4)).toBeNull(); // downward
		expect(crossedThresholdUp(2, 2)).toBeNull(); // no change
	});
});
