import { describe, expect, it } from 'vitest';
import { DESKTOP_BUDGET, MOBILE_BUDGET, meetsBudget, perfBudgetFor } from './perfBudget';

describe('perf budget gates (PRQ-RC0)', () => {
	it('mobile budget is tighter than desktop', () => {
		expect(MOBILE_BUDGET.maxDrawCalls).toBeLessThan(DESKTOP_BUDGET.maxDrawCalls);
		expect(MOBILE_BUDGET.minFps).toBeGreaterThanOrEqual(45);
	});

	it('perfBudgetFor("desktop") = DESKTOP_BUDGET', () => {
		expect(perfBudgetFor('desktop')).toEqual(DESKTOP_BUDGET);
	});

	it('perfBudgetFor("mobile") = MOBILE_BUDGET', () => {
		expect(perfBudgetFor('mobile')).toEqual(MOBILE_BUDGET);
	});

	it('meetsBudget passes within budget', () => {
		expect(meetsBudget({ calls: 100, fps: 60 }, DESKTOP_BUDGET)).toBe(true);
	});

	it('meetsBudget fails on too many draw calls', () => {
		expect(meetsBudget({ calls: DESKTOP_BUDGET.maxDrawCalls + 1, fps: 60 }, DESKTOP_BUDGET)).toBe(
			false,
		);
	});

	it('meetsBudget fails on too low fps', () => {
		expect(meetsBudget({ calls: 50, fps: DESKTOP_BUDGET.minFps - 1 }, DESKTOP_BUDGET)).toBe(false);
	});
});
