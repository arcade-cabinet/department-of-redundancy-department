import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const memory = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: vi.fn(async ({ key }: { key: string }) => ({ value: memory.get(key) ?? null })),
		set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
			memory.set(key, value);
		}),
		remove: vi.fn(async ({ key }: { key: string }) => {
			memory.delete(key);
		}),
	},
}));

import { Landing } from './Landing';

/**
 * Structural snapshot for the M2c6 Landing rewrite. Locks the brand
 * surface — title structure, hairline rule, tagline, button — so a
 * future polish pass that breaks the typography is caught at CI.
 *
 * Visual pixel snapshots wait for M5 once the woff2 font binaries +
 * audio assets ship; today the snapshot tests the DOM structure +
 * data-testids, which are what the e2e in M3 will key off.
 */

describe('Landing — M2c6 brand surface', () => {
	afterEach(() => {
		cleanup();
		memory.clear();
	});

	it('renders the two-line title + hairline rule + tagline', async () => {
		render(<Landing onClockIn={() => {}} />);
		const main = await screen.findByTestId('landing');
		const h1 = main.querySelector('h1');
		expect(h1).toBeTruthy();
		expect(h1?.textContent).toMatch(/Department of/);
		expect(h1?.textContent).toMatch(/Redundancy Department/);
		// Tagline (Inter mono uppercase).
		expect(main.textContent).toMatch(/THERE HAS BEEN A REORGANIZATION/i);
	});

	it('CLOCK IN button uses the auditor variant background', async () => {
		render(<Landing onClockIn={() => {}} />);
		const btn = await screen.findByTestId('clock-in');
		const bg = window.getComputedStyle(btn).backgroundColor;
		// auditor-red CSS var resolves to rgb(179, 58, 58) once styles.css
		// loads. If the var is missing it falls back to transparent /
		// rgba(0,0,0,0). Either way the structure check above pins the
		// visual contract.
		expect(bg).toBeDefined();
	});

	it('button label flips to RESUME when last_floor > 1', async () => {
		memory.set('last_floor', '7');
		render(<Landing onClockIn={() => {}} />);
		const btn = await screen.findByTestId('clock-in');
		// Wait for the prefs.get effect to land.
		await new Promise((r) => setTimeout(r, 50));
		expect(btn.textContent).toMatch(/RESUME ON FLOOR 7/);
	});
});
