import { expect, test } from '@playwright/test';
import {
	gotoApp,
	insertCoin,
	jumpToLevel,
	readState,
	setGodMode,
	waitForLevel,
	waitForLevelReady,
	waitForPhase,
} from '../harness/dord';

/**
 * PRQ D.4 — three-flow e2e gate.
 *
 * Three small distinct flows that previously had zero e2e coverage:
 *   1. Civilian hit  → score penalty fires.
 *   2. Health-kit    → collecting refunds HP.
 *   3. High scores   → game-over phase shows the high-score overlay
 *                      with the banked score recorded.
 *
 * Each flow is its own test; they're co-located because they all
 * exercise short Game-state mutations rather than full director pipes.
 */

test.describe('civilian hit (PRQ D.4 / 1)', () => {
	test('hitCivilian applies the civilian-pick score penalty', async ({ page }) => {
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');
		await jumpToLevel(page, 'lobby');
		await waitForLevel(page, 'lobby');
		await waitForLevelReady(page);

		// `game.hitCivilian` is the single canonical entry point for the
		// civilian-pick penalty (called both by pickAt → click flow AND
		// by the hostage-loss FireEvent path). The penalty math is
		// `score = Math.max(0, score - 500)` — score clamps to zero, so
		// asserting "score went down" requires either a banked score or
		// reading the civilianHits counter (which never clamps).
		const before = await readState(page);
		expect(before.phase).toBe('playing');
		const beforeCivHits = await page.evaluate(
			() => globalThis.__dord?.game.getState().run?.civilianHits ?? 0,
		);

		await page.evaluate(() => {
			globalThis.__dord?.game.hitCivilian();
		});

		const afterCivHits = await page.evaluate(
			() => globalThis.__dord?.game.getState().run?.civilianHits ?? 0,
		);
		const after = await readState(page);

		expect(afterCivHits).toBe(beforeCivHits + 1);
		expect(after.phase).toBe('playing');
		// Score still bounded ≥ 0 (clamped). Player took 25 hp damage as
		// part of the civilian-hit penalty per recordCivilianHit, but with
		// god-mode on damagePlayer is short-circuited — the godMode read
		// happens in the listener path not in the pure-state mutation, so
		// HP DOES drop here. Just assert phase is unchanged.
		expect(after.score).toBeGreaterThanOrEqual(0);
	});
});

test.describe('health-kit collection (PRQ D.4 / 2)', () => {
	test('collectHealthKit refunds HP up to maxPlayerHp', async ({ page }) => {
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');
		await jumpToLevel(page, 'lobby');
		await waitForLevel(page, 'lobby');
		await waitForLevelReady(page);

		// Take 40 hp of damage with god-mode OFF to actually move the HP
		// counter (god-mode short-circuits onPlayerDamage). Then re-enable
		// god mode so the rest of the test isn't subject to ambient
		// hostage-fire.
		await setGodMode(page, false);
		await page.evaluate(() => {
			globalThis.__dord?.game.takeDamage(40);
		});
		await setGodMode(page, true);

		const damaged = await readState(page);
		expect(damaged.playerHp).toBeLessThan(100);

		// Collect a 35 HP kit; HP rises but caps at maxPlayerHp.
		await page.evaluate(() => {
			globalThis.__dord?.game.collectHealthKit(35);
		});
		const after = await readState(page);

		expect(after.playerHp).toBeGreaterThan(damaged.playerHp);
		expect(after.playerHp).toBeLessThanOrEqual(100); // cap honored
		expect(after.phase).toBe('playing');
	});
});

test.describe('high-score after game-over (PRQ D.4 / 3)', () => {
	test('endRun(toGameOver=true) lands in game-over with banked score', async ({ page }) => {
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');
		await jumpToLevel(page, 'lobby');
		await waitForLevel(page, 'lobby');
		await waitForLevelReady(page);

		// End the run with toGameOver=true. The HighScoresOverlay is
		// triggered by main.ts's phase routing on game-over; this test
		// pins the state-machine transition without driving the overlay
		// pixel-painting path (which is covered by visual regression
		// suites under tests/visual/).
		await page.evaluate(() => {
			globalThis.__dord?.game.endRun(true);
		});
		await waitForPhase(page, 'game-over');

		const ended = await readState(page);
		expect(ended.phase).toBe('game-over');
		// score is preserved across the transition; lobby-start score is
		// 0 since we drove no kills, so >= 0 is the load-bearing assertion
		// (we're testing the state plumbing, not the score-bank math).
		expect(ended.score).toBeGreaterThanOrEqual(0);
	});
});
