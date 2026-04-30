import { describe, expect, it } from 'vitest';
import { flickerOnce, pageFade, paperShift, stampPress } from './motion';

describe('motion variants library', () => {
	it('paperShift exposes initial / animate / hover / tap', () => {
		expect(paperShift.initial).toBeDefined();
		expect(paperShift.animate).toBeDefined();
		expect(paperShift.whileHover).toBeDefined();
		expect(paperShift.whileTap).toBeDefined();
	});

	it('stampPress hover scales down on tap (stamp-on-paper feel)', () => {
		const tap = stampPress.whileTap as { scale?: number };
		expect(tap.scale).toBeLessThan(1);
		expect(tap.scale).toBeGreaterThan(0.9); // not a wild squash
	});

	it('pageFade initial.opacity = 0, animate.opacity = 1', () => {
		expect((pageFade.initial as { opacity: number }).opacity).toBe(0);
		expect((pageFade.animate as { opacity: number }).opacity).toBe(1);
	});

	it('flickerOnce is a keyframe array on opacity', () => {
		const animate = flickerOnce.animate as { opacity: number[] };
		expect(Array.isArray(animate.opacity)).toBe(true);
		expect(animate.opacity.length).toBeGreaterThanOrEqual(3);
	});
});
