import type { Page } from '@playwright/test';

/**
 * Player movement + interaction fixtures (PRQ-17 T1, M3c1).
 *
 * tapTravel: simulate a tap-to-travel gesture on the canvas at
 *   normalized [0,1] coords (so tests don't depend on viewport size).
 *
 * holdRadial: simulate the hold gesture that opens the radial menu
 *   at the same normalized position.
 *
 * pickRadial: click an option by id inside an open radial.
 */

export interface NormPos {
	/** 0..1, x along viewport width. */
	x: number;
	/** 0..1, y along viewport height. */
	y: number;
}

export async function tapTravel(page: Page, pos: NormPos): Promise<void> {
	const v = page.viewportSize();
	if (!v) throw new Error('viewportSize unavailable');
	const px = Math.round(pos.x * v.width);
	const py = Math.round(pos.y * v.height);
	// PRQ-05 gesture classifier: down → up <220ms with ≤8px move = tap.
	await page.mouse.move(px, py);
	await page.mouse.down();
	await page.waitForTimeout(60);
	await page.mouse.up();
}

export async function holdRadial(page: Page, pos: NormPos): Promise<void> {
	const v = page.viewportSize();
	if (!v) throw new Error('viewportSize unavailable');
	const px = Math.round(pos.x * v.width);
	const py = Math.round(pos.y * v.height);
	// hold = ≥220ms no move per gesture classifier.
	await page.mouse.move(px, py);
	await page.mouse.down();
	await page.waitForTimeout(280);
	await page.mouse.up();
}

export async function pickRadial(page: Page, optionId: string): Promise<void> {
	// RadialMenu options are rendered with data-testid={`radial-${id}`}
	// per PRQ-05 T5. If the project hasn't named them that, this
	// fixture will fail loudly — log + continue so the test author
	// can fix the testid sweep.
	const sel = page.getByTestId(`radial-${optionId}`);
	await sel.click();
}
