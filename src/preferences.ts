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

export async function loadSettings(): Promise<Settings> {
	const { value } = await Preferences.get({ key: KEYS.settings });
	if (!value) return DEFAULT_SETTINGS;
	try {
		const parsed = JSON.parse(value) as Partial<Settings>;
		return { ...DEFAULT_SETTINGS, ...parsed };
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

/**
 * Load the persisted top-N high-score table, sorted descending by score.
 * Returns an empty array on missing or corrupted storage. Always
 * normalized: clamps to HIGH_SCORE_TABLE_SIZE entries, drops malformed
 * rows.
 */
export async function loadHighScores(): Promise<readonly HighScore[]> {
	const { value } = await Preferences.get({ key: KEYS.highScoresTop });
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return [];
		const rows = parsed.filter(
			(r): r is HighScore =>
				typeof r === 'object' &&
				r !== null &&
				typeof r.score === 'number' &&
				Number.isFinite(r.score) &&
				typeof r.clearedRun === 'boolean' &&
				typeof r.utcDate === 'string',
		);
		return rows
			.slice()
			.sort((a, b) => b.score - a.score)
			.slice(0, HIGH_SCORE_TABLE_SIZE);
	} catch {
		return [];
	}
}

/**
 * Insert a score into the top-N table if it qualifies. Returns the rank
 * (1-indexed) the new score landed at, or null if it did not make the
 * cut. Updates the persistent best (loadHighScore) as a side effect.
 */
export async function recordHighScore(score: HighScore): Promise<number | null> {
	const existing = await loadHighScores();
	const merged = [...existing, score].sort((a, b) => b.score - a.score);
	const top = merged.slice(0, HIGH_SCORE_TABLE_SIZE);
	const rank = top.indexOf(score);
	if (rank === -1) return null;
	await Preferences.set({ key: KEYS.highScoresTop, value: JSON.stringify(top) });
	// Keep the legacy single-best key in sync so saveHighScoreIfBetter and
	// the GameOver "NEW HIGH" banner remain authoritative.
	await saveHighScoreIfBetter(score);
	return rank + 1;
}
