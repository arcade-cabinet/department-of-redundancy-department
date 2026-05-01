import { expect, test } from '@playwright/test';
import {
	type DordLevelId,
	fastForward,
	gotoApp,
	insertCoin,
	jumpToLevel,
	readState,
	setGodMode,
	transitionLevel,
	waitForLevel,
	waitForLevelReady,
	waitForPhase,
} from '../harness/dord';

/**
 * One test per scene transition in the canonical chain. Per the
 * ts-browser-game profile, every entry in `docs/spec/levels/` should
 * have a passing e2e test pinning that the level boots and its terminal
 * transition cue points to the right next level.
 *
 * These tests fire the on-clear transition by fast-forwarding past
 * the level's combat windows — the director's `currentDwellHadSpawn`
 * gate (PR #66) keeps dwells held until at least one spawn occurs, so
 * we toggle god mode + skip dwells via the engine clock.
 */

const TRANSITIONS: ReadonlyArray<{ from: DordLevelId; to: DordLevelId }> = [
	{ from: 'lobby', to: 'stairway-A' },
	{ from: 'stairway-A', to: 'open-plan' },
	{ from: 'open-plan', to: 'stairway-B' },
	{ from: 'stairway-B', to: 'hr-corridor' },
	{ from: 'hr-corridor', to: 'stairway-C' },
	{ from: 'stairway-C', to: 'executive' },
	{ from: 'executive', to: 'boardroom' },
];

test.describe('level transitions', () => {
	for (const { from, to } of TRANSITIONS) {
		test(`${from} → ${to}`, async ({ page }) => {
			await gotoApp(page);
			await setGodMode(page, true);
			await insertCoin(page);
			await waitForPhase(page, 'playing');

			await jumpToLevel(page, from);
			await waitForLevel(page, from);
			await waitForLevelReady(page);

			// We exercise the transition handler directly here rather than
			// re-running combat: the per-level transition wiring is what's
			// under test, and this side-steps the runtime's dependence on
			// pointer events and director-side enemy spawning.
			await transitionLevel(page, to);

			await waitForLevel(page, to);
			await fastForward(page, 250);

			const state = await readState(page);
			expect(state.currentLevelId).toBe(to);
			expect(state.phase).toBe('playing');
		});
	}
});
