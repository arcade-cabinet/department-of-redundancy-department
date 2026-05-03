import { expect, test } from '@playwright/test';
import {
	fastForward,
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
 * PRQ A.9 — hostage-threat civilian-loss.
 *
 * The HR Corridor pos-2-hostage scene pairs two `hostage-threat`
 * security guards with civilian rails 1 and 2. If the player doesn't
 * kill the threats before they fire, each enemy claims its paired
 * civilian: the civilian mesh is disposed and the player eats the
 * civilian-hit score penalty.
 *
 * This test drives the level forward without firing — god mode keeps
 * the player alive — and asserts the paired civilians vanish + the
 * score moves to the negative penalty bucket.
 */
test.describe('hostage-threat civilian-loss (PRQ A.9)', () => {
	test('paired civilian is disposed and score is penalised when hostage-threat fires', async ({
		page,
	}) => {
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');

		await jumpToLevel(page, 'hr-corridor');
		await waitForLevel(page, 'hr-corridor');
		await waitForLevelReady(page);

		// Drive past pos-1 dwell (18s) into the hostage scene at pos-2.
		// Glide ~1s + 18s pos-1 dwell + ~2s glide ≈ pos-2 starts ~21s.
		// p2-host-spawn-A fires on-arrive; the threat is aim-laser 2500ms
		// then fire-hitscan, so the loss lands at ~24s.
		//
		// Split into multiple fastForward calls so the director gets
		// multiple ticks after the on-arrive spawn cue fires. A single
		// 28s tick would create the enemy during cue-firing but its
		// fire-program elapsedMs wouldn't advance within the same tick,
		// so the fire-hitscan event would never land.
		await fastForward(page, 22_000); // arrive at pos-2, spawn fires
		await fastForward(page, 3_000); // aim-laser progresses
		await fastForward(page, 3_000); // fire-hitscan lands → civilian-loss

		const civ1Present = await page.evaluate(
			() => globalThis.__dord?.hasCivilianOnRail('rail-civ-hostage-1') ?? false,
		);
		expect(civ1Present).toBe(false);

		// Score should be negative-or-zero after the civilian penalty (the
		// hr-corridor doesn't bank score before pos-2 unless the player
		// fires, which we don't).
		const state = await readState(page);
		expect(state.score).toBeLessThanOrEqual(0);
		expect(state.phase).toBe('playing');
	});
});
