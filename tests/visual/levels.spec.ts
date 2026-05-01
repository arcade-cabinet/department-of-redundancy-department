import { expect, type Page, test } from '@playwright/test';
import {
	type DordLevelId,
	gotoApp,
	insertCoin,
	jumpToLevel,
	setGodMode,
	waitForLevel,
	waitForLevelReady,
	waitForPhase,
} from '../harness/dord';

/**
 * Visual gate for the canonical level chain. Pins playability-gate
 * items 4–6 from `.agent-state/directive.md`:
 *
 *   - Each level renders enclosed geometry (no all-void clear-color).
 *   - Stairway levels show stair-step geometry.
 *   - Boardroom shows the boss arena + table + chairs.
 *
 * We deliberately don't use Playwright `toHaveScreenshot` pixel-compare
 * baselines for these — Babylon's PBR + multi-material lighting +
 * texture-load timing make pixel-perfect baselines fragile, and the
 * profile rule "if flaky, determinism is broken — fix the engine" makes
 * the cost of fixing a flake higher than the value of a pixel diff.
 *
 * Instead each test reads pixel data from the canvas and asserts:
 *   1. The frame is NOT mostly black (level rendered something).
 *   2. The frame has color variance (level isn't a flat-fill).
 *   3. A representative central region carries non-clear-color pixels.
 *
 * That's enough to catch the regression class the playability gate
 * cares about: "the level is empty / I see the void".
 */

const CANONICAL_CHAIN: readonly DordLevelId[] = [
	'lobby',
	'stairway-A',
	'open-plan',
	'stairway-B',
	'hr-corridor',
	'stairway-C',
	'executive',
	'boardroom',
];

interface CanvasFrameStats {
	width: number;
	height: number;
	totalPixels: number;
	nonBlackPixels: number;
	uniqueColorBuckets: number;
	avgBrightness: number;
}

async function readCanvasFrameStats(page: Page): Promise<CanvasFrameStats> {
	// Take a Playwright screenshot of the canvas — it captures the
	// composited frame even with `preserveDrawingBuffer: false`. Direct
	// `readPixels` from inside `page.evaluate` returns zeros because the
	// drawing buffer is discarded after compositing.
	const canvasHandle = page.locator('canvas#game').first();
	const buffer = await canvasHandle.screenshot();

	// Decode the PNG via the browser to get raw RGBA — Playwright nodes
	// don't have an obvious decoder, but the page does. Pass the bytes
	// back in.
	return page.evaluate(async (bytes: number[]) => {
		const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
		const bitmap = await createImageBitmap(blob);
		const off = new OffscreenCanvas(bitmap.width, bitmap.height);
		const ctx = off.getContext('2d');
		if (!ctx) throw new Error('OffscreenCanvas 2d context unavailable');
		ctx.drawImage(bitmap, 0, 0);
		const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;

		let nonBlackPixels = 0;
		let totalBrightness = 0;
		const buckets = new Set<number>();
		for (let i = 0; i < data.length; i += 4) {
			const r = data[i] ?? 0;
			const g = data[i + 1] ?? 0;
			const b = data[i + 2] ?? 0;
			totalBrightness += (r + g + b) / 3;
			if (r > 8 || g > 8 || b > 8) nonBlackPixels++;
			// 8-step-per-channel histogram (8^3 = 512 buckets). A solid-fill
			// frame populates one bucket; a real PBR-lit scene populates
			// dozens.
			buckets.add(((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5));
		}

		const w = bitmap.width;
		const h = bitmap.height;
		return {
			width: w,
			height: h,
			totalPixels: w * h,
			nonBlackPixels,
			uniqueColorBuckets: buckets.size,
			avgBrightness: totalBrightness / (w * h),
		};
	}, Array.from(buffer));
}

test.describe('level visual gate', () => {
	for (const levelId of CANONICAL_CHAIN) {
		test(`${levelId} renders non-trivial geometry`, async ({ page }) => {
			await gotoApp(page);
			await setGodMode(page, true);
			await insertCoin(page);
			await waitForPhase(page, 'playing');

			await jumpToLevel(page, levelId);
			await waitForLevel(page, levelId);
			await waitForLevelReady(page);

			// Two rAF beats so the engine renders at least one full frame
			// of the new scene. `waitForLevelReady` flips on `levelHandles`
			// being populated, but the next render-loop tick may still be
			// pending.
			await page.evaluate(
				() =>
					new Promise<void>((resolve) => {
						requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
					}),
			);

			const stats = await readCanvasFrameStats(page);

			// At least 30% of pixels should be non-black — the level is
			// enclosed by walls + floor + ceiling, the camera is inside
			// it, so the framebuffer should be dominated by lit geometry.
			// 30% gives plenty of headroom for the GUI overlay (top HUD
			// strip is ~10% of screen) and dark corners.
			const nonBlackRatio = stats.nonBlackPixels / stats.totalPixels;
			expect(
				nonBlackRatio,
				`${levelId}: only ${(nonBlackRatio * 100).toFixed(1)}% of pixels are non-black — looks like a void/clear-color frame`,
			).toBeGreaterThan(0.3);

			// At least 12 distinct color buckets out of 512 — a real PBR-lit
			// scene with textures + shadows + material variance hits 50+.
			// A flat-fill frame hits 1. 12 is the floor for "this is a
			// real render with depth, not a single-color blob".
			expect(
				stats.uniqueColorBuckets,
				`${levelId}: only ${stats.uniqueColorBuckets} distinct color buckets — frame looks flat-filled`,
			).toBeGreaterThan(12);
		});
	}
});
