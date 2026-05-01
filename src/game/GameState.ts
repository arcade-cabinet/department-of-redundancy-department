import type { Difficulty } from '../encounter';
import type { LevelId } from '../levels/types';
import type { Lives } from '../preferences';

/**
 * Top-level game state machine — drives which screen is shown and what the
 * runtime ticks. No router, no React. Just a pure-data state transition table.
 */

export type GameMode = 'standard' | 'daily-challenge';

export type GamePhase =
	| 'insert-coin'
	| 'difficulty-select'
	| 'playing'
	| 'continue-prompt'
	| 'game-over'
	| 'victory'
	| 'settings'
	| 'high-scores';

export interface RunState {
	readonly difficulty: Difficulty;
	readonly lives: Lives;
	readonly mode: GameMode;
	readonly currentLevelId: LevelId;
	readonly playerHp: number;
	readonly maxPlayerHp: number;
	readonly remainingLives: number;
	readonly score: number;
	readonly comboCount: number;
	readonly civilianHits: number;
	readonly enemiesKilled: number;
	readonly headshots: number;
	readonly justiceShots: number;
	readonly startedAtMs: number;
}

export interface GameState {
	readonly phase: GamePhase;
	readonly run: RunState | null;
}

export const INITIAL_GAME_STATE: GameState = {
	phase: 'insert-coin',
	run: null,
};

export const PLAYER_BASE_HP = 100;
export const COMBO_CAP = 30;
export const COMBO_STEP = 0.05;

export function comboMultiplier(combo: number): number {
	return 1.0 + COMBO_STEP * Math.min(Math.max(0, combo), COMBO_CAP);
}

export function startRun(difficulty: Difficulty, lives: Lives, mode: GameMode): GameState {
	const livesCount = lives === 'permadeath' ? 1 : 3;
	return {
		phase: 'playing',
		run: {
			difficulty,
			lives,
			mode,
			currentLevelId: 'lobby',
			playerHp: PLAYER_BASE_HP,
			maxPlayerHp: PLAYER_BASE_HP,
			remainingLives: livesCount,
			score: 0,
			comboCount: 0,
			civilianHits: 0,
			enemiesKilled: 0,
			headshots: 0,
			justiceShots: 0,
			startedAtMs: performance.now(),
		},
	};
}

export function damagePlayer(state: GameState, damage: number): GameState {
	if (!state.run || state.phase !== 'playing') return state;
	const newHp = state.run.playerHp - damage;
	if (newHp > 0) {
		return { ...state, run: { ...state.run, playerHp: newHp, comboCount: 0 } };
	}
	const remaining = state.run.remainingLives - 1;
	if (remaining <= 0) {
		return { ...state, phase: 'game-over', run: { ...state.run, playerHp: 0, remainingLives: 0 } };
	}
	return {
		...state,
		phase: 'continue-prompt',
		run: { ...state.run, playerHp: 0, remainingLives: remaining },
	};
}

export function resumeFromContinue(state: GameState): GameState {
	if (!state.run || state.phase !== 'continue-prompt') return state;
	return {
		...state,
		phase: 'playing',
		run: { ...state.run, playerHp: state.run.maxPlayerHp, comboCount: 0 },
	};
}

export function recordKill(state: GameState, target: 'head' | 'body' | 'justice'): GameState {
	if (!state.run || state.phase !== 'playing') return state;
	const baseScore = target === 'head' ? 250 : target === 'justice' ? 200 : 100;
	const combo = state.run.comboCount + 1;
	const earned = Math.round(baseScore * comboMultiplier(combo));
	return {
		...state,
		run: {
			...state.run,
			score: state.run.score + earned,
			comboCount: combo,
			enemiesKilled: state.run.enemiesKilled + 1,
			headshots: state.run.headshots + (target === 'head' ? 1 : 0),
			justiceShots: state.run.justiceShots + (target === 'justice' ? 1 : 0),
		},
	};
}

export function recordCivilianHit(state: GameState): GameState {
	if (!state.run || state.phase !== 'playing') return state;
	return damagePlayer(
		{
			...state,
			run: {
				...state.run,
				score: Math.max(0, state.run.score - 500),
				civilianHits: state.run.civilianHits + 1,
				comboCount: 0,
			},
		},
		25,
	);
}

export function transitionLevel(state: GameState, toLevelId: LevelId): GameState {
	if (!state.run || state.phase !== 'playing') return state;
	if (toLevelId === 'victory') {
		return { ...state, phase: 'victory', run: { ...state.run, currentLevelId: 'victory' } };
	}
	return { ...state, run: { ...state.run, currentLevelId: toLevelId } };
}

export function setPhase(state: GameState, phase: GamePhase): GameState {
	return { ...state, phase };
}
