import { describe, expect, it } from 'vitest';

/**
 * The native adapter (`client.native.ts`) imports `@capacitor-community/sqlite`,
 * which has different behavior on web vs. native. PRQ-04 T4 acceptance:
 * the module imports cleanly under node/test (no top-level side effects
 * that crash without a Capacitor host). Full validation lands in PRQ-16
 * (mobile shell) on real iOS/Android.
 */
describe('db adapters: import smoke', () => {
	it('client.native.ts imports without throwing', async () => {
		const mod = await import('./client.native');
		expect(typeof mod.getDb).toBe('function');
	});

	it('client.web.ts imports without throwing', async () => {
		const mod = await import('./client.web');
		expect(typeof mod.getDb).toBe('function');
	});

	it('client.ts dispatcher exports getDb', async () => {
		const mod = await import('./client');
		expect(typeof mod.getDb).toBe('function');
	});
});
