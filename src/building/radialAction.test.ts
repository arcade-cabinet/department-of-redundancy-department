import { describe, expect, it } from 'vitest';
import { radialIdToSlug } from './radialAction';

describe('radial action → block slug map', () => {
	it('maps known place- ids to their placed block slug', () => {
		expect(radialIdToSlug('place-stair')).toBe('placed-stair-block');
		expect(radialIdToSlug('place-wall')).toBe('placed-wall-block');
		expect(radialIdToSlug('place-desk')).toBe('placed-desk-block');
		expect(radialIdToSlug('place-terminal')).toBe('placed-terminal');
	});

	it('returns null for unknown ids', () => {
		expect(radialIdToSlug('cancel')).toBeNull();
		expect(radialIdToSlug('mine')).toBeNull();
		expect(radialIdToSlug('unknown')).toBeNull();
	});
});
