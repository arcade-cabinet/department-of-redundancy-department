import type { Page } from '@playwright/test';

/**
 * Typed view of the `globalThis.__dord` debug surface that
 * `src/main.ts` installs in dev/test builds (gated by `IS_DEV`).
 *
 * Tests run against `pnpm dev`, so `__dord` is always present. The
 * shape here is the single source of truth for both this harness and
 * any inline `page.evaluate` blocks in spec files — keep it in sync
 * with `src/main.ts`. The `declare global` block makes
 * `globalThis.__dord` typed inside `page.evaluate` callbacks (which
 * run in the browser, so they can't import this file's exports —
 * the global declaration is the only way to share the shape).
 */

export type DordPhase =
	| 'insert-coin'
	| 'playing'
	| 'continue-prompt'
	| 'game-over'
	| 'victory'
	| 'settings'
	| 'high-scores'
	| 'cabinet-stats';

export type DordLevelId =
	| 'lobby'
	| 'stairway-A'
	| 'open-plan'
	| 'stairway-B'
	| 'hr-corridor'
	| 'stairway-C'
	| 'executive'
	| 'boardroom'
	| 'victory';

export interface DordRunState {
	currentLevelId: DordLevelId;
	playerHp: number;
	maxPlayerHp: number;
	remainingLives: number;
	score: number;
	enemiesKilled: number;
}

export interface DordGameState {
	phase: DordPhase;
	run: DordRunState | null;
}

export interface DordGame {
	getState: () => DordGameState;
	insertCoin: (nowMs: number) => void;
	takeDamage: (n: number) => void;
	continueRun: () => void;
	transitionLevel: (id: DordLevelId) => void;
	endRun: (toGameOver: boolean) => void;
}

export interface DordSurface {
	game: DordGame;
	jumpToLevel: (id: DordLevelId) => void;
	fastForward: (ms: number) => void;
	levelHandlesReady: () => boolean;
	now: () => number;
}

declare global {
	var __dord: DordSurface | undefined;
	var __dordGod: boolean | undefined;
}

export interface DordState {
	phase: DordPhase;
	currentLevelId: DordLevelId | null;
	playerHp: number;
	remainingLives: number;
	score: number;
	enemiesKilled: number;
}

export async function gotoApp(page: Page): Promise<void> {
	await page.goto('/');
	await page.waitForFunction(() => globalThis.__dord != null && 'game' in globalThis.__dord);
	await page.evaluate(() => document.fonts.ready);
}

export async function readState(page: Page): Promise<DordState> {
	return page.evaluate(() => {
		if (!globalThis.__dord) throw new Error('__dord not present — dev hooks missing');
		const s = globalThis.__dord.game.getState();
		return {
			phase: s.phase,
			currentLevelId: s.run?.currentLevelId ?? null,
			playerHp: s.run?.playerHp ?? 0,
			remainingLives: s.run?.remainingLives ?? 0,
			score: s.run?.score ?? 0,
			enemiesKilled: s.run?.enemiesKilled ?? 0,
		};
	});
}

export async function insertCoin(page: Page): Promise<void> {
	// Use the engine-clock now() exposed via `__dord.now` rather than
	// `performance.now()` — the ts-browser-game profile mandates the
	// engine clock facade as the single time source so future test-mode
	// virtual time (`?frame=N`) doesn't diverge from real time.
	await page.evaluate(() => {
		const dord = globalThis.__dord;
		if (!dord) throw new Error('__dord not present — dev hooks missing');
		dord.game.insertCoin(dord.now());
	});
}

export async function setGodMode(page: Page, on: boolean): Promise<void> {
	await page.evaluate((flag) => {
		globalThis.__dordGod = flag;
	}, on);
}

export async function jumpToLevel(page: Page, id: DordLevelId): Promise<void> {
	await page.evaluate((target) => {
		globalThis.__dord?.jumpToLevel(target);
	}, id);
}

export async function fastForward(page: Page, ms: number): Promise<void> {
	await page.evaluate((delta) => {
		globalThis.__dord?.fastForward(delta);
	}, ms);
}

/**
 * Apply lethal damage equal to current maxPlayerHp. damagePlayer()
 * short-circuits when phase isn't 'playing', so this lands at most
 * one transition into continue-prompt per call.
 */
export async function killPlayerOnce(page: Page): Promise<void> {
	await page.evaluate(() => {
		const dord = globalThis.__dord;
		if (!dord) throw new Error('__dord missing');
		const run = dord.game.getState().run;
		if (!run) throw new Error('no active run');
		dord.game.takeDamage(run.maxPlayerHp);
	});
}

export async function continueRun(page: Page): Promise<void> {
	await page.evaluate(() => {
		globalThis.__dord?.game.continueRun();
	});
}

export async function transitionLevel(page: Page, to: DordLevelId): Promise<void> {
	await page.evaluate((target) => {
		globalThis.__dord?.game.transitionLevel(target);
	}, to);
}

export async function endRun(page: Page, toGameOver: boolean): Promise<void> {
	await page.evaluate((go) => {
		globalThis.__dord?.game.endRun(go);
	}, toGameOver);
}

/**
 * Block until the active level's `buildLevel` promise has resolved and
 * the runtime's `levelHandles` are populated. Without this guard a
 * `jumpToLevel` followed by a fastForward can race the async build and
 * leave the scene black (the render guard at src/main.ts skips frames
 * until handles are present).
 */
export async function waitForLevelReady(page: Page, timeoutMs = 30_000): Promise<void> {
	await page.waitForFunction(() => globalThis.__dord?.levelHandlesReady?.() === true, undefined, {
		timeout: timeoutMs,
	});
}

export async function waitForPhase(
	page: Page,
	phase: DordPhase,
	timeoutMs = 30_000,
): Promise<void> {
	await page.waitForFunction(
		(target) => globalThis.__dord?.game.getState().phase === target,
		phase,
		{ timeout: timeoutMs },
	);
}

export async function waitForLevel(
	page: Page,
	levelId: DordLevelId,
	timeoutMs = 30_000,
): Promise<void> {
	await page.waitForFunction(
		(target) => globalThis.__dord?.game.getState().run?.currentLevelId === target,
		levelId,
		{ timeout: timeoutMs },
	);
}
