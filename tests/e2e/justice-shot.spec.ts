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
		// window opens. open-plan rail dwells for 18s at pos-1 then arrives
		// pos-2 where the justice-glint enemy spawns. Window is 300ms wide
		// (elapsedMs ∈ [300, 600) per firePatterns.ts:140-141).
		//
		// Run the simulation in a single in-page loop rather than a
		// page.waitForFunction polling loop — the polling variant pays a
		// ~150ms wallclock round-trip per 100ms simulated tick, which is
		// fine locally (~36s) but blows the 60s budget on slower CI
		// runners. An in-page tick loop pays the cost once.
		const enemyId = await page.evaluate(async (): Promise<string> => {
			const dord = globalThis.__dord;
			if (!dord) throw new Error('__dord missing');
			const STRIDE_MS = 100;
			const MAX_SIM_MS = 90_000;
			for (let elapsed = 0; elapsed < MAX_SIM_MS; elapsed += STRIDE_MS) {
				dord.fastForward(STRIDE_MS);
				const snaps = dord.enemySnapshots();
				for (const s of snaps) {
					if (dord.isJusticeWindowOpen(s.id)) return s.id;
				}
				// Yield to the event loop occasionally so the page doesn't
				// freeze. RAF gives Babylon a chance to render frames too,
				// which keeps the engine clock in step with director time.
				if (elapsed % 1000 === 0) {
					await new Promise<void>((r) => requestAnimationFrame(() => r()));
				}
			}
			throw new Error(`justice window never opened in ${MAX_SIM_MS}ms simulated time`);
		});

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

		// In-page tick loop (rationale on the scoring test above). Captures
		// both the enemy id AND the visibility of its child glint mesh
		// when the window opens. We dig into the Babylon scene via the
		// engine handle on `__dord` to avoid adding more debug surface
		// for one assertion.
		const payload = await page.evaluate(
			async (): Promise<{ id: string; glintVisible: boolean }> => {
				const dord = globalThis.__dord as unknown as {
					fastForward: (ms: number) => void;
					enemySnapshots: () => Array<{ id: string }>;
					isJusticeWindowOpen: (id: string) => boolean;
					engine: { scenes: Array<{ getMeshByName: (n: string) => unknown }> };
				};
				if (!dord) throw new Error('__dord missing');
				const STRIDE_MS = 100;
				const MAX_SIM_MS = 90_000;
				for (let elapsed = 0; elapsed < MAX_SIM_MS; elapsed += STRIDE_MS) {
					dord.fastForward(STRIDE_MS);
					const snaps = dord.enemySnapshots();
					for (const s of snaps) {
						if (!dord.isJusticeWindowOpen(s.id)) continue;
						for (const scene of dord.engine.scenes) {
							const glint = scene.getMeshByName(`glint-${s.id}`) as
								| { isVisible: boolean }
								| null;
							if (glint) return { id: s.id, glintVisible: glint.isVisible };
						}
					}
					if (elapsed % 1000 === 0) {
						await new Promise<void>((r) => requestAnimationFrame(() => r()));
					}
				}
				throw new Error(`justice window never opened in ${MAX_SIM_MS}ms simulated time`);
			},
		);
		expect(payload.glintVisible).toBe(true);
	});
});
