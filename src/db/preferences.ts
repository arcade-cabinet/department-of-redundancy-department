import { Preferences } from '@capacitor/preferences';

/**
 * Typed wrapper over `@capacitor/preferences`. Spec §8.5 lists 8 keys;
 * each has a baked-in default so callers never see `null` mid-game.
 *
 * Why not put these in SQLite (world_meta)? Two reasons:
 *  - Settings outlive a save: a player may delete their save (reset
 *    progress) but expect their volume + sensitivity to persist.
 *  - Capacitor's Preferences uses NSUserDefaults / SharedPreferences
 *    on native platforms — it survives app reinstalls (with backup
 *    enabled) more reliably than the SQLite file.
 */

export type GraphicsTier = 'low' | 'medium' | 'high';
export type ControlsScheme = 'tap-and-hold' | 'two-finger' | 'gamepad';

export interface PrefValueMap {
	volume_master: number;
	volume_sfx: number;
	volume_music: number;
	look_sensitivity: number;
	graphics_tier: GraphicsTier;
	world_seed: string;
	last_floor: number;
	controls_scheme: ControlsScheme;
}

export type PrefKey = keyof PrefValueMap;
export type PrefValue<K extends PrefKey> = PrefValueMap[K];

/** Defaults applied when the key is absent from storage. */
export const PREF_DEFAULTS: Readonly<PrefValueMap> = Object.freeze({
	volume_master: 0.8,
	volume_sfx: 1.0,
	volume_music: 0.6,
	look_sensitivity: 1.0,
	graphics_tier: 'medium',
	world_seed: '',
	last_floor: 1,
	controls_scheme: 'tap-and-hold',
});

const NUMERIC_KEYS = new Set<PrefKey>([
	'volume_master',
	'volume_sfx',
	'volume_music',
	'look_sensitivity',
	'last_floor',
]);

/** Read a preference. Returns the spec-baked default on missing or
 *  malformed data — no `null` ever reaches the caller. */
export async function get<K extends PrefKey>(key: K): Promise<PrefValue<K>> {
	const { value } = await Preferences.get({ key });
	if (value == null) return PREF_DEFAULTS[key];
	return parse(key, value) as PrefValue<K>;
}

/** Write a preference. Numbers are stringified; strings stored verbatim. */
export async function set<K extends PrefKey>(key: K, value: PrefValue<K>): Promise<void> {
	const stringified = NUMERIC_KEYS.has(key) ? String(value) : (value as string);
	await Preferences.set({ key, value: stringified });
}

/** Remove a preference (next get() returns the default). */
export async function clear(key: PrefKey): Promise<void> {
	await Preferences.remove({ key });
}

/** Wipe every DORD preference. Used by the "reset settings" UI button. */
export async function clearAll(): Promise<void> {
	await Promise.all(
		(Object.keys(PREF_DEFAULTS) as PrefKey[]).map((k) => Preferences.remove({ key: k })),
	);
}

function parse<K extends PrefKey>(key: K, raw: string): PrefValue<K> {
	if (NUMERIC_KEYS.has(key)) {
		const n = Number(raw);
		if (!Number.isFinite(n)) return PREF_DEFAULTS[key];
		return n as PrefValue<K>;
	}
	if (key === 'graphics_tier') {
		if (raw === 'low' || raw === 'medium' || raw === 'high') return raw as PrefValue<K>;
		return PREF_DEFAULTS[key];
	}
	if (key === 'controls_scheme') {
		if (raw === 'tap-and-hold' || raw === 'two-finger' || raw === 'gamepad') {
			return raw as PrefValue<K>;
		}
		return PREF_DEFAULTS[key];
	}
	// world_seed: any string is acceptable.
	return raw as PrefValue<K>;
}
