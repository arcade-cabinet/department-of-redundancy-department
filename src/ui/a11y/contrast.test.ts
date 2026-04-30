import { describe, expect, it } from 'vitest';
import { contrastRatio, meetsWCAG_AA, meetsWCAG_AAA } from './contrast';

describe('WCAG contrast (PRQ-RC1)', () => {
	it('white-on-black ratio = 21', () => {
		expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
	});

	it('black-on-white = same as white-on-black', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
	});

	it('same color = 1', () => {
		expect(contrastRatio('#888888', '#888888')).toBeCloseTo(1, 1);
	});

	it('AA text passes ≥ 4.5', () => {
		expect(meetsWCAG_AA(7, 'normal')).toBe(true);
		expect(meetsWCAG_AA(3, 'normal')).toBe(false);
	});

	it('AA large text passes ≥ 3', () => {
		expect(meetsWCAG_AA(3.5, 'large')).toBe(true);
		expect(meetsWCAG_AA(2.9, 'large')).toBe(false);
	});

	it('AAA tighter than AA', () => {
		expect(meetsWCAG_AAA(7, 'normal')).toBe(true);
		expect(meetsWCAG_AAA(5, 'normal')).toBe(false);
	});

	it('DORD palette: paper-on-ink meets AA normal', () => {
		const r = contrastRatio('#f4f1ea', '#15181c');
		expect(meetsWCAG_AA(r, 'normal')).toBe(true);
	});
});
