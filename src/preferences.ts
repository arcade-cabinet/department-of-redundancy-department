import { Preferences } from '@capacitor/preferences';
import type { Difficulty } from './encounter';

/**
 * Capacitor.Preferences-backed settings & high-score storage.
 * No SQLite, no save blob. It's an arcade game — we keep keys.
 *
 * Works on web (localStorage shim) and native (UserDefaults / SharedPreferences).
 */

export type Lives = 'three-lives' | 'permadeath';

export interface Settings {
	readonly difficulty: Difficulty;
	readonly lives: Lives;
	readonly masterVolume: number;
	readonly musicVolume: number;
	readonly sfxVolume: number;
	readonly hapticsEnabled: boolean;
}

export interface HighScore {
	readonly score: number;
	readonly difficulty: Difficulty;
	readonly lives: Lives;
	readonly clearedRun: boolean;
	readonly utcDate: string; // YYYY-MM-DD
}

export const DEFAULT_SETTINGS: Settings = {
	difficulty: 'normal',
	lives: 'three-lives',
	masterVolume: 1.0,
	musicVolume: 0.7,
	sfxVolume: 0.9,
	hapticsEnabled: true,
};

const KEYS = {
	settings: 'dord:settings:v1',
	highScore: 'dord:high-score:v1',
	dailyHighScore: 'dord:daily-high-score:v1',
	firstLobbyCleared: 'dord:first-lobby-cleared:v1',
	difficultiesUnlocked: 'dord:difficulties-unlocked:v1',
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

export async function loadDailyHighScore(utcDate: string): Promise<HighScore | null> {
	const { value } = await Preferences.get({ key: `${KEYS.dailyHighScore}:${utcDate}` });
	if (!value) return null;
	try {
		return JSON.parse(value) as HighScore;
	} catch {
		return null;
	}
}

export async function saveDailyHighScoreIfBetter(score: HighScore): Promise<boolean> {
	const existing = await loadDailyHighScore(score.utcDate);
	if (existing && existing.score >= score.score) return false;
	await Preferences.set({
		key: `${KEYS.dailyHighScore}:${score.utcDate}`,
		value: JSON.stringify(score),
	});
	return true;
}

export async function isFirstLobbyCleared(): Promise<boolean> {
	const { value } = await Preferences.get({ key: KEYS.firstLobbyCleared });
	return value === 'true';
}

export async function markFirstLobbyCleared(): Promise<void> {
	await Preferences.set({ key: KEYS.firstLobbyCleared, value: 'true' });
}

export async function loadUnlockedDifficulties(): Promise<readonly Difficulty[]> {
	const { value } = await Preferences.get({ key: KEYS.difficultiesUnlocked });
	if (!value) return ['easy', 'normal'];
	try {
		const parsed = JSON.parse(value);
		if (Array.isArray(parsed)) return parsed as Difficulty[];
		return ['easy', 'normal'];
	} catch {
		return ['easy', 'normal'];
	}
}

export async function unlockDifficulty(difficulty: Difficulty): Promise<void> {
	const current = await loadUnlockedDifficulties();
	if (current.includes(difficulty)) return;
	const next = [...current, difficulty];
	await Preferences.set({ key: KEYS.difficultiesUnlocked, value: JSON.stringify(next) });
}
