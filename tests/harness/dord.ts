import type { Page } from '@playwright/test';

/**
 * Typed view of the `globalThis.__dord` debug surface that
 * `src/main.ts` installs in dev/test builds (gated by `IS_DEV`).
 *
 * Tests run against `pnpm dev`, so `__dord` is always present. The
 * field-by-field shape here is what the harness uses; keep it in sync
 * with main.ts.
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
	await page.waitForFunction(() => {
		const dord = (globalThis as { __dord?: object }).__dord;
		return dord != null && 'game' in dord;
	});
	await page.evaluate(() => document.fonts.ready);
}

export async function readState(page: Page): Promise<DordState> {
	return page.evaluate(() => {
		const dord = (globalThis as { __dord?: { game: { getState: () => unknown } } }).__dord;
		if (!dord) throw new Error('__dord not present — dev hooks missing');
		const s = dord.game.getState() as {
			phase: DordPhase;
			run: {
				currentLevelId: DordLevelId;
				playerHp: number;
				remainingLives: number;
				score: number;
				enemiesKilled: number;
			} | null;
		};
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
	await page.evaluate(() => {
		const dord = (globalThis as { __dord?: { game: { insertCoin: (n: number) => void } } }).__dord;
		dord?.game.insertCoin(performance.now());
	});
}

export async function setGodMode(page: Page, on: boolean): Promise<void> {
	await page.evaluate((flag) => {
		(globalThis as { __dordGod?: boolean }).__dordGod = flag;
	}, on);
}

export async function jumpToLevel(page: Page, id: DordLevelId): Promise<void> {
	await page.evaluate((target) => {
		const dord = (globalThis as { __dord?: { jumpToLevel: (id: string) => void } }).__dord;
		dord?.jumpToLevel(target);
	}, id);
}

export async function fastForward(page: Page, ms: number): Promise<void> {
	await page.evaluate((delta) => {
		const dord = (globalThis as { __dord?: { fastForward: (ms: number) => void } }).__dord;
		dord?.fastForward(delta);
	}, ms);
}

/**
 * Block until the active level's `buildLevel` promise has resolved and
 * the runtime's `levelHandles` are populated. Without this guard a
 * `jumpToLevel` followed by a fastForward can race the async build and
 * leave the scene black (the render guard at src/main.ts skips frames
 * until handles are present).
 */
export async function waitForLevelReady(page: Page, timeoutMs = 30_000): Promise<void> {
	await page.waitForFunction(
		() => {
			const dord = (globalThis as { __dord?: { levelHandlesReady?: () => boolean } }).__dord;
			return dord?.levelHandlesReady?.() === true;
		},
		undefined,
		{ timeout: timeoutMs },
	);
}

export async function waitForPhase(
	page: Page,
	phase: DordPhase,
	timeoutMs = 30_000,
): Promise<void> {
	await page.waitForFunction(
		(target) => {
			const dord = (globalThis as { __dord?: { game: { getState: () => { phase: string } } } })
				.__dord;
			return dord?.game.getState().phase === target;
		},
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
		(target) => {
			const dord = (
				globalThis as {
					__dord?: { game: { getState: () => { run: { currentLevelId: string } | null } } };
				}
			).__dord;
			return dord?.game.getState().run?.currentLevelId === target;
		},
		levelId,
		{ timeout: timeoutMs },
	);
}
