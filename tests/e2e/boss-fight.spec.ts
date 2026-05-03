import { expect, type Page, test } from '@playwright/test';
import {
	fastForward,
	gotoApp,
	insertCoin,
	jumpToLevel,
	readEnemySnapshots,
	setGodMode,
	waitForEnemySpawn,
	waitForLevel,
	waitForLevelReady,
	waitForPhase,
} from '../harness/dord';

/**
 * PRQ D.3 — boss-fight e2e.
 *
 * Drives the boardroom level forward, lets the Reaper boss spawn, then
 * uses the dev `__dord.hitEnemy` surface to land enough body shots to
 * push the boss past its phase-one HP threshold. Asserts:
 *
 *   1. The reaper boss enemy id (`boss-reaper`) appears in
 *      `enemySnapshots` after on-arrive.
 *   2. Hitting the boss enough times advances HP toward zero (the
 *      automatic boss-phase cue fires when phase-1 HP is consumed,
 *      which `EncounterDirector` already covers via unit tests; here
 *      we just confirm the runtime wiring drives HP).
 *   3. Eventually the boss disappears from `enemySnapshots` (death) —
 *      no transition to game-over from the player side, because we
 *      stayed in god-mode the whole time.
 *
 * The total simulated time is bounded: we drive 2s slices and cap at
 * 30s of in-engine time so a regression that prevents kills doesn't
 * spin the test forever.
 */

const REAPER_ENEMY_ID = 'boss-reaper';

async function killReaper(page: Page, maxBodyShots: number): Promise<{ shotsFired: number }> {
	for (let i = 0; i < maxBodyShots; i++) {
		const snaps = await readEnemySnapshots(page);
		const reaper = snaps.find((s) => s.id === REAPER_ENEMY_ID);
		if (!reaper) {
			return { shotsFired: i };
		}
		await page.evaluate(
			({ id, target }) => {
				globalThis.__dord?.hitEnemy(id, target);
			},
			{ id: REAPER_ENEMY_ID, target: 'body' as const },
		);
	}
	return { shotsFired: maxBodyShots };
}

test.describe('boss fight (PRQ D.3)', () => {
	test('Reaper spawns, takes damage, and is killed', async ({ page }) => {
		test.setTimeout(60_000);
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');
		await jumpToLevel(page, 'boardroom');
		await waitForLevel(page, 'boardroom');
		await waitForLevelReady(page);

		// Drive past pre-boss approach until at least one enemy is on
		// screen — that's the on-arrive `reaper-anchor-ad` (a hitman) plus
		// the boss itself.
		const initial = await waitForEnemySpawn(page, 60_000);
		expect(initial.length).toBeGreaterThan(0);

		// Find the reaper specifically. If the on-arrive cues haven't
		// fired the boss-spawn yet, drive a bit more time.
		let foundReaper = initial.some((s) => s.id === REAPER_ENEMY_ID);
		for (let attempt = 0; attempt < 10 && !foundReaper; attempt++) {
			await fastForward(page, 500);
			const snaps = await readEnemySnapshots(page);
			foundReaper = snaps.some((s) => s.id === REAPER_ENEMY_ID);
		}
		expect(foundReaper).toBe(true);

		// Land body shots until the reaper disappears. The reaper has 1500 HP
		// and body damage is 100, so 15 shots minimum + headroom for the
		// phase boundary cue handling.
		const { shotsFired } = await killReaper(page, 60);
		expect(shotsFired).toBeLessThan(60); // reaper actually died

		const finalSnaps = await readEnemySnapshots(page);
		const stillAlive = finalSnaps.some((s) => s.id === REAPER_ENEMY_ID);
		expect(stillAlive).toBe(false);
	});
});
