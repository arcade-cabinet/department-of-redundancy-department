import { Preferences } from '@capacitor/preferences';

/**
 * Capacitor.Preferences-backed settings & high-score storage.
 * No SQLite, no save blob. It's an arcade game — we keep keys.
 *
 * Works on web (localStorage shim) and native (UserDefaults / SharedPreferences).
 *
 * The canonical-run pivot (docs/spec/00-overview.md, 06-economy.md) removed
 * the difficulty selector and the unlock ladder. There is one canonical run.
 * The quarter economy lives in src/game/quarters.ts under its own
 * `dord.economy` namespace; this file owns user settings + high scores only.
 */

export interface Settings {
	readonly masterVolume: number;
	readonly musicVolume: number;
	readonly sfxVolume: number;
	readonly hapticsEnabled: boolean;
}

export interface HighScore {
	readonly score: number;
	readonly clearedRun: boolean;
	readonly utcDate: string; // YYYY-MM-DD
}

export const DEFAULT_SETTINGS: Settings = {
	masterVolume: 1.0,
	musicVolume: 0.7,
	sfxVolume: 0.9,
	hapticsEnabled: true,
};

const KEYS = {
	settings: 'dord:settings:v1',
	highScore: 'dord:high-score:v1',
	highScoresTop: 'dord:high-scores:top:v1',
} as const;

export const HIGH_SCORE_TABLE_SIZE = 10;

// Hard caps to keep a tampered Preferences value from blocking the main
// thread on cold-load. Real payload at MAX size is ~600 bytes; 64KB is
// generous headroom while still bounding parse cost.
const MAX_HIGH_SCORES_BYTES = 64 * 1024;
const MAX_HIGH_SCORES_ROWS = 1000;
const MAX_HIGH_SCORE_VALUE = 1e12;
const UTC_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Volumes are 0..1 inclusive; settings JSON is small, but the same byte
// cap as the high-scores key bounds parse cost on tampered storage.
const MAX_SETTINGS_BYTES = 4 * 1024;

function clamp01(n: unknown, fallback: number): number {
	if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
	if (n < 0) return 0;
	if (n > 1) return 1;
	return n;
}

function strictBool(b: unknown, fallback: boolean): boolean {
	return typeof b === 'boolean' ? b : fallback;
}

export async function loadSettings(): Promise<Settings> {
	const { value } = await Preferences.get({ key: KEYS.settings });
	if (!value) return DEFAULT_SETTINGS;
	if (value.length > MAX_SETTINGS_BYTES) return DEFAULT_SETTINGS;
	try {
		const parsed = JSON.parse(value);
		if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS;
		const obj = parsed as Record<string, unknown>;
		// Per-field validation. Storage is user-writable on native shells, and
		// these values flow into the audio bus and haptics — a non-numeric
		// volume becomes NaN gain (silent audio) and a non-boolean haptic flag
		// can crash the haptics plugin.
		return {
			masterVolume: clamp01(obj.masterVolume, DEFAULT_SETTINGS.masterVolume),
			musicVolume: clamp01(obj.musicVolume, DEFAULT_SETTINGS.musicVolume),
			sfxVolume: clamp01(obj.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
			hapticsEnabled: strictBool(obj.hapticsEnabled, DEFAULT_SETTINGS.hapticsEnabled),
		};
	} catch {
		return DEFAULT_SETTINGS;
	}
}

export async function saveSettings(settings: Settings): Promise<void> {
	await Preferences.set({ key: KEYS.settings, value: JSON.stringify(settings) });
}

export async function loadHighScore(): Promise<HighScore | null> {
	const { value } = await Preferences.get({ key: KEYS.highScore });
	if (!value) return null;
	try {
		return JSON.parse(value) as HighScore;
	} catch {
		return null;
	}
}

export async function saveHighScoreIfBetter(score: HighScore): Promise<boolean> {
	const existing = await loadHighScore();
	if (existing && existing.score >= score.score) return false;
	await Preferences.set({ key: KEYS.highScore, value: JSON.stringify(score) });
	return true;
}

function isValidHighScore(r: unknown): r is HighScore {
	if (typeof r !== 'object' || r === null) return false;
	const row = r as Record<string, unknown>;
	return (
		typeof row.score === 'number' &&
		Number.isInteger(row.score) &&
		row.score >= 0 &&
		row.score <= MAX_HIGH_SCORE_VALUE &&
		typeof row.clearedRun === 'boolean' &&
		typeof row.utcDate === 'string' &&
		UTC_DATE_RE.test(row.utcDate)
	);
}

/**
 * Load the persisted top-N high-score table, sorted descending by score.
 * Returns an empty array on missing or corrupted storage. Always
 * normalized: clamps to HIGH_SCORE_TABLE_SIZE entries, drops malformed
 * rows. Bytes/row count are capped to bound parse cost on tampered
 * storage.
 */
export async function loadHighScores(): Promise<readonly HighScore[]> {
	const { value } = await Preferences.get({ key: KEYS.highScoresTop });
	if (!value) return [];
	if (value.length > MAX_HIGH_SCORES_BYTES) return [];
	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return [];
		const capped = parsed.slice(0, MAX_HIGH_SCORES_ROWS);
		const rows = capped.filter(isValidHighScore);
		return rows
			.slice()
			.sort((a, b) => b.score - a.score)
			.slice(0, HIGH_SCORE_TABLE_SIZE);
	} catch {
		return [];
	}
}

// Single-writer chain so concurrent recordHighScore calls (e.g. game-over
// + auto-save) cannot interleave the read-modify-write and lose entries.
let highScoreWriteChain: Promise<unknown> = Promise.resolve();

function enqueueHighScoreWrite<T>(fn: () => Promise<T>): Promise<T> {
	const next = highScoreWriteChain.then(fn, fn);
	highScoreWriteChain = next.catch(() => undefined);
	return next;
}

async function recordHighScoreLocked(score: HighScore): Promise<number | null> {
	if (!isValidHighScore(score)) return null;
	const existing = await loadHighScores();
	// Compute rank by counting strictly-greater scores. Stable across
	// duplicate-score ties (newest tying entry sorts after existing) and
	// independent of object identity.
	const greater = existing.reduce((n, e) => (e.score > score.score ? n + 1 : n), 0);
	if (greater >= HIGH_SCORE_TABLE_SIZE) return null;
	const merged = [...existing, score].sort((a, b) => b.score - a.score);
	const top = merged.slice(0, HIGH_SCORE_TABLE_SIZE);
	await Preferences.set({ key: KEYS.highScoresTop, value: JSON.stringify(top) });
	// Update the legacy single-best key only when this score is the new #1,
	// inline (no second RMW). Order matters: legacy key written last so a
	// crash between writes leaves the table authoritative.
	if (greater === 0) {
		await Preferences.set({ key: KEYS.highScore, value: JSON.stringify(score) });
	}
	return greater + 1;
}

/**
 * Insert a score into the top-N table if it qualifies. Returns the rank
 * (1-indexed) the new score landed at, or null if it did not make the
 * cut. Serialized so concurrent calls cannot drop entries.
 */
export function recordHighScore(score: HighScore): Promise<number | null> {
	return enqueueHighScoreWrite(() => recordHighScoreLocked(score));
}
