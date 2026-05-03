import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for `nativeBoot`. The contract is:
 *
 *   - `configureStatusBar` calls StatusBar.setStyle({Dark}) AND
 *     setOverlaysWebView({overlay:false}). Both rejections are
 *     swallowed (web has no status bar — must fail silent so the
 *     same boot path runs in browser + native).
 *   - `hideSplash` calls SplashScreen.hide({fadeOutDuration:200}).
 *     Rejections swallowed for the same reason.
 *   - `triggerHapticOnFire` calls Haptics.impact with `Light` style
 *     and is fire-and-forget — must NOT await, must NOT throw on
 *     rejection (haptics latency on a busy thread would mush trigger
 *     feel; serialising it would defeat the purpose).
 */

const setStyle = vi.fn();
const setOverlaysWebView = vi.fn();
const hide = vi.fn();
const impact = vi.fn();

vi.mock('@capacitor/status-bar', () => ({
	StatusBar: {
		setStyle: (...args: unknown[]) => setStyle(...args),
		setOverlaysWebView: (...args: unknown[]) => setOverlaysWebView(...args),
	},
	Style: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' },
}));

vi.mock('@capacitor/splash-screen', () => ({
	SplashScreen: {
		hide: (...args: unknown[]) => hide(...args),
	},
}));

vi.mock('@capacitor/haptics', () => ({
	Haptics: {
		impact: (...args: unknown[]) => impact(...args),
	},
	ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
}));

import { configureStatusBar, hideSplash, triggerHapticOnFire } from './nativeBoot';

describe('configureStatusBar', () => {
	beforeEach(() => {
		setStyle.mockReset();
		setOverlaysWebView.mockReset();
	});

	it('configures dark style + non-overlay mode in the happy path', async () => {
		setStyle.mockResolvedValue(undefined);
		setOverlaysWebView.mockResolvedValue(undefined);
		await configureStatusBar();
		expect(setStyle).toHaveBeenCalledWith({ style: 'DARK' });
		expect(setOverlaysWebView).toHaveBeenCalledWith({ overlay: false });
	});

	it('swallows a setStyle rejection (web stub / unsupported)', async () => {
		setStyle.mockRejectedValue(new Error('not available on web'));
		setOverlaysWebView.mockResolvedValue(undefined);
		await expect(configureStatusBar()).resolves.toBeUndefined();
	});

	it('swallows a setOverlaysWebView rejection', async () => {
		setStyle.mockResolvedValue(undefined);
		setOverlaysWebView.mockRejectedValue(new Error('not available on web'));
		await expect(configureStatusBar()).resolves.toBeUndefined();
	});
});

describe('hideSplash', () => {
	beforeEach(() => {
		hide.mockReset();
	});

	it('calls SplashScreen.hide with a 200ms fade-out', async () => {
		hide.mockResolvedValue(undefined);
		await hideSplash();
		expect(hide).toHaveBeenCalledWith({ fadeOutDuration: 200 });
	});

	it('swallows the rejection on web (no plugin attached)', async () => {
		hide.mockRejectedValue(new Error('not available on web'));
		await expect(hideSplash()).resolves.toBeUndefined();
	});
});

describe('triggerHapticOnFire', () => {
	let unhandled: unknown[] = [];
	let unhandledHandler: ((reason: unknown) => void) | null = null;

	beforeEach(() => {
		impact.mockReset();
		unhandled = [];
		unhandledHandler = (reason: unknown) => unhandled.push(reason);
		// Catch any escaped rejection so a leaky implementation would
		// surface here as an actual test failure.
		process.on('unhandledRejection', unhandledHandler);
	});

	afterEach(() => {
		if (unhandledHandler) process.off('unhandledRejection', unhandledHandler);
	});

	it('calls Haptics.impact with Light style', () => {
		impact.mockResolvedValue(undefined);
		triggerHapticOnFire();
		expect(impact).toHaveBeenCalledWith({ style: 'LIGHT' });
	});

	it('is synchronous — does NOT await (fire-and-forget for trigger feel)', () => {
		// Stall the impact promise. The function still returns immediately.
		let resolveImpact: () => void = () => undefined;
		impact.mockReturnValue(
			new Promise<void>((r) => {
				resolveImpact = r;
			}),
		);
		const ret = triggerHapticOnFire();
		// Returns void synchronously — not a thenable.
		expect(ret).toBeUndefined();
		// Clean up so the pending promise doesn't leak across tests.
		resolveImpact();
	});

	it('swallows a rejection silently (no unhandled rejection escape)', async () => {
		impact.mockRejectedValue(new Error('haptics unsupported'));
		triggerHapticOnFire();
		// Microtask flush so the .catch attaches and runs.
		await new Promise<void>((r) => setImmediate(r));
		expect(unhandled).toHaveLength(0);
	});
});
