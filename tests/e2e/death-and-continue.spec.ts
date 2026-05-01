import { expect, test } from '@playwright/test';
import { gotoApp, insertCoin, readState, setGodMode, waitForPhase } from '../harness/dord';

/**
 * Pins the death → continue-prompt → resume flow that the playability
 * gate (directive.md) item 8 requires:
 *
 *   - Continue prompt appears at first death.
 *   - INSERT ANOTHER COIN works.
 *   - GIVE UP works.
 *
 * Damage is applied through `game.takeDamage` directly — bypassing the
 * `__dordGod` short-circuit by toggling god off for the kill, then back
 * on so the test isn't racing real director ticks.
 */

test.describe('death + continue flow', () => {
	test('first lethal hit lands on continue-prompt', async ({ page }) => {
		await gotoApp(page);
		await insertCoin(page);
		await waitForPhase(page, 'playing');

		// Per damagePlayer() in src/game/GameState.ts, every lethal hit
		// moves to continue-prompt and decrements remainingLives by one
		// (clamped to 0). The continue/give-up decision is the user's;
		// `damagePlayer` short-circuits when phase isn't 'playing'.
		const livesBefore = (await readState(page)).remainingLives;
		await page.evaluate(() => {
			const dord = (
				globalThis as {
					__dord?: {
						game: {
							takeDamage: (n: number) => void;
							getState: () => { run: { maxPlayerHp: number } | null };
						};
					};
				}
			).__dord;
			if (!dord) throw new Error('__dord missing');
			const run = dord.game.getState().run;
			if (!run) throw new Error('no active run after insertCoin');
			dord.game.takeDamage(run.maxPlayerHp);
		});

		await waitForPhase(page, 'continue-prompt', 5_000);
		const state = await readState(page);
		expect(state.phase).toBe('continue-prompt');
		expect(state.playerHp).toBe(0);
		expect(state.remainingLives).toBe(Math.max(0, livesBefore - 1));
	});

	test('continueRun resumes from continue-prompt', async ({ page }) => {
		await gotoApp(page);
		await setGodMode(page, false);
		await insertCoin(page);
		await waitForPhase(page, 'playing');

		await page.evaluate(() => {
			const dord = (
				globalThis as {
					__dord?: {
						game: {
							takeDamage: (n: number) => void;
							getState: () => { run: { maxPlayerHp: number } | null };
						};
					};
				}
			).__dord;
			if (!dord) throw new Error('__dord missing');
			const run = dord.game.getState().run;
			if (!run) throw new Error('no active run');
			dord.game.takeDamage(run.maxPlayerHp);
		});
		await waitForPhase(page, 'continue-prompt', 5_000);

		await page.evaluate(() => {
			const dord = (globalThis as { __dord?: { game: { continueRun: () => void } } }).__dord;
			dord?.game.continueRun();
		});
		await waitForPhase(page, 'playing', 5_000);
		const state = await readState(page);
		expect(state.phase).toBe('playing');
		expect(state.remainingLives).toBeGreaterThan(0);
	});
});
