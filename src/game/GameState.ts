import type { Difficulty } from '../encounter';
import type { LevelId } from '../levels/types';
import type { Lives } from '../preferences';
import type { DailyModifierId } from './dailyChallenge';

/**
 * Top-level game state machine — drives which screen is shown and what the
 * runtime ticks. No router, no React. Just a pure-data state transition table.
 */

export type GameMode = 'standard' | 'daily-challenge';

// Two-weapon loadout per docs/spec/00-overview.md. Pistol is the default;
// rifle is swap-tab. Reload is 1.0s per spec.
export type WeaponKind = 'pistol' | 'rifle';

export interface WeaponDef {
	readonly kind: WeaponKind;
	readonly magSize: number;
	readonly reloadDurationMs: number;
}

export const WEAPONS: Readonly<Record<WeaponKind, WeaponDef>> = {
	pistol: { kind: 'pistol', magSize: 8, reloadDurationMs: 1000 },
	rifle: { kind: 'rifle', magSize: 30, reloadDurationMs: 1000 },
};

export interface WeaponState {
	readonly active: WeaponKind;
	readonly pistolAmmo: number;
	readonly rifleAmmo: number;
	// Wall-clock ms (engine clock) at which the in-flight reload completes.
	// null when not reloading.
	readonly reloadEndsAtMs: number | null;
}

export const INITIAL_WEAPON_STATE: WeaponState = {
	active: 'pistol',
	pistolAmmo: WEAPONS.pistol.magSize,
	rifleAmmo: WEAPONS.rifle.magSize,
	reloadEndsAtMs: null,
};

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
	// Active daily-challenge modifier when mode === 'daily-challenge'.
	// null in standard runs.
	readonly dailyModifier: DailyModifierId | null;
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
	readonly weapon: WeaponState;
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

export function startRun(
	difficulty: Difficulty,
	lives: Lives,
	mode: GameMode,
	nowMs: number,
	dailyModifier: DailyModifierId | null = null,
): GameState {
	const livesCount = lives === 'permadeath' ? 1 : 3;
	return {
		phase: 'playing',
		run: {
			difficulty,
			lives,
			mode,
			dailyModifier,
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
			startedAtMs: nowMs,
			weapon: INITIAL_WEAPON_STATE,
		},
	};
}

function ammoOf(weapon: WeaponState): number {
	return weapon.active === 'pistol' ? weapon.pistolAmmo : weapon.rifleAmmo;
}

function withAmmo(weapon: WeaponState, ammo: number): WeaponState {
	return weapon.active === 'pistol'
		? { ...weapon, pistolAmmo: ammo }
		: { ...weapon, rifleAmmo: ammo };
}

export type FireOutcome =
	| { readonly kind: 'shot'; readonly state: GameState }
	| { readonly kind: 'dry-pull'; readonly state: GameState }
	| { readonly kind: 'misfire' };

/**
 * Trigger pull. Returns:
 *  - 'shot'      → ammo decremented, bullet leaves barrel
 *  - 'dry-pull'  → empty mag; auto-reload queued, no bullet
 *  - 'misfire'   → currently reloading; nothing happens
 *
 * Note: while `reloadEndsAtMs !== null`, `consumeAmmo` always returns
 * 'misfire' regardless of whether nowMs has passed reloadEndsAtMs. Only
 * `tickReload` clears the reloading state — this prevents a rapid-click
 * reload-loop at the tail of a reload window.
 */
export function tryConsumeAmmo(state: GameState, nowMs: number): FireOutcome {
	if (!state.run || state.phase !== 'playing') return { kind: 'misfire' };
	const weapon = state.run.weapon;
	if (weapon.reloadEndsAtMs !== null) return { kind: 'misfire' };
	const ammo = ammoOf(weapon);
	if (ammo <= 0) {
		const def = WEAPONS[weapon.active];
		const reloading: WeaponState = { ...weapon, reloadEndsAtMs: nowMs + def.reloadDurationMs };
		return {
			kind: 'dry-pull',
			state: { ...state, run: { ...state.run, weapon: reloading } },
		};
	}
	const newAmmo = ammo - 1;
	const next: WeaponState = withAmmo(weapon, newAmmo);
	const finalWeapon: WeaponState =
		newAmmo === 0
			? { ...next, reloadEndsAtMs: nowMs + WEAPONS[weapon.active].reloadDurationMs }
			: next;
	return {
		kind: 'shot',
		state: { ...state, run: { ...state.run, weapon: finalWeapon } },
	};
}

export function startReload(state: GameState, nowMs: number): GameState {
	if (!state.run || state.phase !== 'playing') return state;
	const weapon = state.run.weapon;
	if (weapon.reloadEndsAtMs !== null) return state;
	const def = WEAPONS[weapon.active];
	if (ammoOf(weapon) >= def.magSize) return state;
	return {
		...state,
		run: {
			...state.run,
			weapon: { ...weapon, reloadEndsAtMs: nowMs + def.reloadDurationMs },
		},
	};
}

export function tickReload(state: GameState, nowMs: number): GameState {
	if (!state.run || state.phase !== 'playing') return state;
	const weapon = state.run.weapon;
	if (weapon.reloadEndsAtMs === null || nowMs < weapon.reloadEndsAtMs) return state;
	const def = WEAPONS[weapon.active];
	const refilled: WeaponState = {
		...withAmmo(weapon, def.magSize),
		reloadEndsAtMs: null,
	};
	return { ...state, run: { ...state.run, weapon: refilled } };
}

export function swapWeapon(state: GameState): GameState {
	if (!state.run || state.phase !== 'playing') return state;
	const weapon = state.run.weapon;
	// Swap is instant; cancels any in-flight reload (player chose to switch
	// weapons rather than wait for reload).
	const next: WeaponState = {
		...weapon,
		active: weapon.active === 'pistol' ? 'rifle' : 'pistol',
		reloadEndsAtMs: null,
	};
	return { ...state, run: { ...state.run, weapon: next } };
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
