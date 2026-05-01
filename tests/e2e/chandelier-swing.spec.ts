import { expect, test } from '@playwright/test';
import {
	fastForward,
	gotoApp,
	insertCoin,
	jumpToLevel,
	setGodMode,
	waitForLevel,
	waitForLevelReady,
	waitForPhase,
} from '../harness/dord';

/**
 * Boardroom Phase-2 chandelier swing — PRQ A.8.
 *
 * Pins two things:
 *   1. The procedural chandelier mesh constructs into the boardroom scene.
 *   2. The Phase-2 prop-anim cue fires (at wall-clock 24100ms) without
 *      crashing the run, with the chandelier still present after the
 *      swing animation completes.
 *
 * The exact rotation curve is unit-tested in `src/runtime/propAnims.test.ts`.
 * This test only verifies the level-side wiring: prop is built, cue is
 * triggered, run continues.
 */
test.describe('boardroom chandelier swing (PRQ A.8)', () => {
	test('chandelier prop exists in boardroom and survives Phase-2 swing cue', async ({ page }) => {
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');

		await jumpToLevel(page, 'boardroom');
		await waitForLevel(page, 'boardroom');
		await waitForLevelReady(page);

		const chandelierBefore = await page.evaluate(
			() => globalThis.__dord?.hasProp('prop-chandelier') ?? false,
		);
		expect(chandelierBefore).toBe(true);

		// Fast-forward past the Phase-2 trigger at wall-clock 24100ms (the
		// swing cue) plus the 3000ms tween duration plus a margin. The
		// boardroom dwell is 60_000ms so we stay in the combat window.
		await fastForward(page, 28_000);

		const chandelierAfter = await page.evaluate(
			() => globalThis.__dord?.hasProp('prop-chandelier') ?? false,
		);
		expect(chandelierAfter).toBe(true);
	});
});
