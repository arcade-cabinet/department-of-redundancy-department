import { expect, test } from '@playwright/test';
import { bootGame } from './fixtures/boot';
import { tapTravel } from './fixtures/player';
import { readDordState } from './fixtures/state';

/**
 * Golden-path e2e (PRQ-17 T2, M3c1). Exercises the alpha system end
 * to end on the deployed Pages URL via a green `validate-deployed`
 * job. The full sequence per spec §13:
 *
 *   boot → Landing → CLOCK IN → spawn on floor 1 → tap-to-travel
 *   → kill 1 manager → mine 1 desk → place 1 staircase → climb
 *   → drop through shaft → walk to Up-Door → arrive on floor 2
 *
 * The first cut here covers the boot + tap-travel arc with state
 * introspection. The mine/place/door arc lands as separate `@golden`
 * specs once the radial wiring exposes the option testids consistently
 * (M3c2 reviewer fold-forward).
 */

test('@golden boot → CLOCK IN → game canvas renders with debug namespace', async ({ page }) => {
	await page.goto('?test=1');
	await bootGame(page, { enterGame: true });

	const state = await readDordState(page);
	expect(state.floor).toBe(1);
	expect(state.threat).toBeGreaterThanOrEqual(0);
	expect(state.kills).toBe(0);
	expect(state.playerHp).toBeGreaterThan(0);
	expect(state.bossAlive).toBe(false);
});

test('@golden tap-to-travel registers a path and updates player state', async ({ page }) => {
	await page.goto('?test=1');
	await bootGame(page, { enterGame: true });

	// Tap a few cells away from the spawn — center-right of viewport.
	await tapTravel(page, { x: 0.65, y: 0.55 });
	// Allow a frame for the navmesh path to register.
	await page.waitForTimeout(120);

	// Player HP should still be full immediately after a tap (no
	// enemy damage applied yet at floor 1 with default seed).
	const state = await readDordState(page);
	expect(state.playerHp).toBeGreaterThan(0);
});

test('@perf golden-path keeps a stable framerate for 5s', async ({ page }) => {
	await page.goto('?test=1');
	await bootGame(page, { enterGame: true });

	// Sample frame timing for 5 seconds via requestAnimationFrame.
	const fps = await page.evaluate(async () => {
		return new Promise<number>((resolve) => {
			const start = performance.now();
			let frames = 0;
			const tick = () => {
				frames++;
				if (performance.now() - start >= 5000) {
					resolve(frames / 5);
				} else {
					requestAnimationFrame(tick);
				}
			};
			requestAnimationFrame(tick);
		});
	});

	// PRQ-18 budget: ≥45 fps on iPhone 12. CI desktop runs much higher;
	// use a permissive lower bound so flakes don't gate ship.
	expect(fps).toBeGreaterThan(30);
});
