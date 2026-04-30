import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mock @capacitor/preferences with a plain in-memory map. The real
 * plugin's web shim already does this; we mock so the test runs under
 * pure node (no DOM, no Capacitor host) and still exercises every code
 * path in src/db/preferences.ts.
 */
const store = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: vi.fn(async ({ key }: { key: string }) => ({
			value: store.has(key) ? (store.get(key) ?? null) : null,
		})),
		set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
			store.set(key, value);
		}),
		remove: vi.fn(async ({ key }: { key: string }) => {
			store.delete(key);
		}),
	},
}));

import * as prefs from './preferences';

beforeEach(() => store.clear());

describe('preferences typed wrapper', () => {
	it('returns spec defaults when keys absent', async () => {
		expect(await prefs.get('volume_master')).toBe(0.8);
		expect(await prefs.get('graphics_tier')).toBe('medium');
		expect(await prefs.get('controls_scheme')).toBe('tap-and-hold');
		expect(await prefs.get('last_floor')).toBe(1);
		expect(await prefs.get('world_seed')).toBe('');
	});

	it('round-trips numbers, strings, enums', async () => {
		await prefs.set('volume_master', 0.42);
		await prefs.set('graphics_tier', 'high');
		await prefs.set('world_seed', 'Synergistic');
		await prefs.set('last_floor', 7);
		expect(await prefs.get('volume_master')).toBe(0.42);
		expect(await prefs.get('graphics_tier')).toBe('high');
		expect(await prefs.get('world_seed')).toBe('Synergistic');
		expect(await prefs.get('last_floor')).toBe(7);
	});

	it('falls back to default on malformed numeric storage', async () => {
		// Simulate corrupt write (e.g., from a different version writing
		// `"NaN"` or empty string). The wrapper should ignore it.
		store.set('volume_master', 'not-a-number');
		expect(await prefs.get('volume_master')).toBe(0.8);
	});

	it('falls back to default on unknown enum value', async () => {
		store.set('graphics_tier', 'cinematic'); // not in enum
		expect(await prefs.get('graphics_tier')).toBe('medium');
	});

	it('clear() removes a single key; clearAll() removes all DORD keys', async () => {
		await prefs.set('volume_master', 0.1);
		await prefs.set('world_seed', 'X');
		await prefs.clear('volume_master');
		expect(await prefs.get('volume_master')).toBe(0.8);
		expect(await prefs.get('world_seed')).toBe('X');
		await prefs.clearAll();
		expect(await prefs.get('world_seed')).toBe('');
	});
});
