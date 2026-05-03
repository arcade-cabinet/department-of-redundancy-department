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
 * Justice-shot e2e gate. Pins:
 *
 *   1. EncounterDirector reports an OPEN justice window during the aim
 *      phase of a `justice-glint` fire program.
 *   2. `__dord.hitEnemy(id, 'justice')` routes through the listener
 *      (`onEnemyHit` → `enemyLastHitTarget` → `onEnemyKill` → `recordKill`).
 *   3. Score banks 200 for the justice kill (vs 100 body / 250 head per
 *      `docs/spec/03-difficulty-and-modifiers.md:62`).
 *   4. `state.run.justiceShots` increments by exactly 1.
 *
 * Open-plan is the canonical first level with a `justice-glint` cue
 * (`src/levels/open-plan.ts:462`). We jump there, fast-forward the director
 * until that cue fires, then poll for the window opening before driving
 * the synthetic hit.
 */

test.describe('justice shot', () => {
	test('justice hit during open glint window banks 200 + increments justiceShots', async ({
		page,
	}) => {
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');
		await jumpToLevel(page, 'open-plan');
		await waitForLevel(page, 'open-plan');
		await waitForLevelReady(page);

		// Fast-forward until at least one justice-glint enemy spawns AND its
		// window opens. The open-plan justice-glint enemy spawns on `pos-2`
		// arrival; rail glide + dwell timing means the spawn happens within
		// the first ~30s of simulated time.
		//
		// The window is 300ms wide (elapsedMs ∈ [300, 600) per
		// firePatterns.ts:140-141). We hop in 100ms steps so the post-tick
		// observation lands inside the window deterministically — a 250ms
		// stride could land the FIRST observation past the window if the
		// enemy spawned mid-tick (elapsed jumps 0 → 250 → 500 → 750, with
		// only the 500-tick observation falling in the window; flake-prone
		// when other tick-time costs perturb the stride).
		const justice = await page.waitForFunction(
			() => {
				if (!globalThis.__dord) return null;
				globalThis.__dord.fastForward(100);
				const snaps = globalThis.__dord.enemySnapshots();
				for (const s of snaps) {
					if (globalThis.__dord.isJusticeWindowOpen(s.id)) return s.id;
				}
				return null;
			},
			null,
			{ timeout: 60_000, polling: 50 },
		);
		const enemyId = await justice.jsonValue();
		if (typeof enemyId !== 'string') {
			throw new Error('expected a justice-glint enemy id from waitForFunction');
		}

		const before = await readState(page);

		// Drive the justice hit. middle-manager bodyDamage = 100, hp = 60 →
		// one justice-routed hit kills it (justice damage is the body damage
		// per `EncounterDirector.hitEnemy:265`).
		await page.evaluate((id: string) => {
			if (!globalThis.__dord) throw new Error('__dord missing');
			globalThis.__dord.hitEnemy(id, 'justice');
		}, enemyId);

		// Allow one tick for state subscribers to flush.
		await page.evaluate(() => globalThis.__dord?.fastForward(16));

		const after = await readState(page);
		// Justice base score is 200; combo multiplier may add a few % on top
		// (depends on prior kills during fast-forward). Pin the exact branch
		// via `justiceShots` (only 'justice' kills bump it) AND assert the
		// score diff sits in the 200-justice band, not the 100-body band.
		expect(after.justiceShots - before.justiceShots).toBe(1);
		expect(after.score - before.score).toBeGreaterThanOrEqual(200);
		expect(after.score - before.score).toBeLessThan(250);
	});

	test('glint VFX mesh is visible during open justice window', async ({ page }) => {
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');
		await jumpToLevel(page, 'open-plan');
		await waitForLevel(page, 'open-plan');
		await waitForLevelReady(page);

		// Same wait as the scoring test, but capture both the enemy id AND
		// the visibility of its child glint mesh when the window opens. We
		// dig into the Babylon scene via the engine handle on `__dord` to
		// avoid adding more debug surface for one assertion. 100ms stride
		// reasoning lives on the scoring test above.
		const result = await page.waitForFunction(
			() => {
				if (!globalThis.__dord) return null;
				globalThis.__dord.fastForward(100);
				const snaps = globalThis.__dord.enemySnapshots();
				for (const s of snaps) {
					if (!globalThis.__dord.isJusticeWindowOpen(s.id)) continue;
					// Find the child glint mesh by name. The capsule is named
					// `enemy-${id}` and the glint is `glint-${id}`. Both live
					// in the active scene; pull from `engine.scenes`.
					const dord = globalThis.__dord as unknown as {
						engine: { scenes: Array<{ getMeshByName: (n: string) => unknown }> };
					};
					for (const scene of dord.engine.scenes) {
						const glint = scene.getMeshByName(`glint-${s.id}`) as { isVisible: boolean } | null;
						if (glint) return { id: s.id, glintVisible: glint.isVisible };
					}
				}
				return null;
			},
			null,
			{ timeout: 60_000, polling: 50 },
		);
		const payload = (await result.jsonValue()) as { id: string; glintVisible: boolean } | null;
		if (!payload) throw new Error('expected glint check payload');
		expect(payload.glintVisible).toBe(true);
	});
});
