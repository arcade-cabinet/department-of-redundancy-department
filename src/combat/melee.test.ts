import { describe, expect, it } from 'vitest';
import { checkMelee } from './melee';

const FORWARD_X = { x: 1, z: 0 };
const ORIGIN = { x: 0, z: 0 };
const RANGE = 1.5;
const FACING = 30;

describe('checkMelee', () => {
	it('hits at range 1.4 directly ahead', () => {
		const r = checkMelee(ORIGIN, FORWARD_X, { x: 1.4, z: 0 }, RANGE, FACING);
		expect(r.hit).toBe(true);
	});

	it('misses at range 1.6', () => {
		const r = checkMelee(ORIGIN, FORWARD_X, { x: 1.6, z: 0 }, RANGE, FACING);
		expect(r.hit).toBe(false);
		expect(r.reason).toBe('too-far');
	});

	it('misses behind', () => {
		const r = checkMelee(ORIGIN, FORWARD_X, { x: -1, z: 0 }, RANGE, FACING);
		expect(r.hit).toBe(false);
		expect(r.reason).toBe('wrong-facing');
	});

	it('hits at the facing-arc edge (29° off-axis)', () => {
		const angle = (29 * Math.PI) / 180;
		const r = checkMelee(
			ORIGIN,
			FORWARD_X,
			{ x: Math.cos(angle), z: Math.sin(angle) },
			RANGE,
			FACING,
		);
		expect(r.hit).toBe(true);
	});

	it('misses just outside the facing arc (35°)', () => {
		const angle = (35 * Math.PI) / 180;
		const r = checkMelee(
			ORIGIN,
			FORWARD_X,
			{ x: Math.cos(angle), z: Math.sin(angle) },
			RANGE,
			FACING,
		);
		expect(r.hit).toBe(false);
		expect(r.reason).toBe('wrong-facing');
	});

	it('handles target at exactly the player position', () => {
		const r = checkMelee(ORIGIN, FORWARD_X, ORIGIN, RANGE, FACING);
		expect(r.hit).toBe(true);
	});

	it('rejects zero-magnitude forward', () => {
		const r = checkMelee(ORIGIN, { x: 0, z: 0 }, { x: 1, z: 0 }, RANGE, FACING);
		expect(r.hit).toBe(false);
		expect(r.reason).toBe('invalid');
	});

	it('non-unit forward still works (vector normalized internally)', () => {
		const r = checkMelee(ORIGIN, { x: 5, z: 0 }, { x: 1, z: 0 }, RANGE, FACING);
		expect(r.hit).toBe(true);
	});
});
