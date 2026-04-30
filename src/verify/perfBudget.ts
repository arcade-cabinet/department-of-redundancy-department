/**
 * Codified perf budget tables (PRQ-RC0, M6). Spec §12 numbers.
 * The runtime e2e (perf.spec.ts) reads these instead of inlining
 * thresholds, so a future tuning pass touches one file.
 */

export interface PerfBudget {
	maxDrawCalls: number;
	maxActiveLights: number;
	minFps: number;
	maxHeapMb: number;
	maxFrameMs: number;
}

export const DESKTOP_BUDGET: PerfBudget = {
	maxDrawCalls: 500,
	maxActiveLights: 16,
	minFps: 45,
	maxHeapMb: 350,
	maxFrameMs: 1000 / 45,
};

export const MOBILE_BUDGET: PerfBudget = {
	maxDrawCalls: 250,
	maxActiveLights: 8,
	minFps: 45,
	maxHeapMb: 350,
	maxFrameMs: 1000 / 45,
};

export type PerfPlatform = 'desktop' | 'mobile';

export function perfBudgetFor(platform: PerfPlatform): PerfBudget {
	return platform === 'mobile' ? MOBILE_BUDGET : DESKTOP_BUDGET;
}

export interface PerfSample {
	calls: number;
	fps: number;
}

export function meetsBudget(sample: PerfSample, budget: PerfBudget): boolean {
	if (sample.calls > budget.maxDrawCalls) return false;
	if (sample.fps < budget.minFps) return false;
	return true;
}
