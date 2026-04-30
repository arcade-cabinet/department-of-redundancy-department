import { describe, expect, it } from 'vitest';
import { motion, radius, shadow, spacing } from './scales';

describe('design tokens — scales', () => {
	it('spacing scale matches PRQ-14 T2 spec [0,4,8,12,16,24,32,48,64]', () => {
		expect(spacing).toEqual({
			0: '0px',
			1: '4px',
			2: '8px',
			3: '12px',
			4: '16px',
			5: '24px',
			6: '32px',
			7: '48px',
			8: '64px',
		});
	});

	it('radius scale [0,2,4,8]', () => {
		expect(radius).toEqual({
			0: '0px',
			1: '2px',
			2: '4px',
			3: '8px',
		});
	});

	it('shadow scale has paperDrop + deep entries', () => {
		expect(shadow.paperDrop).toMatch(/rgba/);
		expect(shadow.deep).toMatch(/rgba/);
	});

	it('motion durations match spec', () => {
		expect(motion.duration).toEqual({
			instant: 80,
			fast: 160,
			base: 240,
			slow: 480,
		});
	});

	it('motion easings include entrance + exit defaults', () => {
		expect(motion.easing.entrance).toBeDefined();
		expect(motion.easing.exit).toBeDefined();
	});
});
