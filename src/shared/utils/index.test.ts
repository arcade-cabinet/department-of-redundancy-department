import { describe, expect, it } from 'vitest';
import { clamp } from './index';

describe('clamp', () => {
	it('returns value within range unchanged', () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});

	it('clamps below min', () => {
		expect(clamp(-3, 0, 10)).toBe(0);
	});

	it('clamps above max', () => {
		expect(clamp(15, 0, 10)).toBe(10);
	});
});
