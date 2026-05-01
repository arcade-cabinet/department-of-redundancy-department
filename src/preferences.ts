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
} as const;

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
