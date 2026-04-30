import { describe, expect, it } from 'vitest';
import {
	expandTapTarget,
	MIN_TAP_TARGET_PX,
	type SafeAreaInsets,
	safeAreaPadding,
} from './mobileUx';

describe('mobile UX helpers (PRQ-B9)', () => {
	it('MIN_TAP_TARGET_PX matches Apple HIG / Material 44px', () => {
		expect(MIN_TAP_TARGET_PX).toBe(44);
	});

	it('expandTapTarget rounds up small dimensions to MIN_TAP_TARGET_PX', () => {
		expect(expandTapTarget(20)).toBe(MIN_TAP_TARGET_PX);
		expect(expandTapTarget(43.9)).toBe(MIN_TAP_TARGET_PX);
		expect(expandTapTarget(44)).toBe(44);
		expect(expandTapTarget(60)).toBe(60);
	});

	it('safeAreaPadding returns CSS values from insets', () => {
		const insets: SafeAreaInsets = { top: 47, right: 0, bottom: 34, left: 0 };
		const css = safeAreaPadding(insets);
		expect(css.paddingTop).toBe('47px');
		expect(css.paddingRight).toBe('0px');
		expect(css.paddingBottom).toBe('34px');
		expect(css.paddingLeft).toBe('0px');
	});

	it('zero insets → zero padding', () => {
		const css = safeAreaPadding({ top: 0, right: 0, bottom: 0, left: 0 });
		expect(css.paddingTop).toBe('0px');
	});
});
