import type { Page } from '@playwright/test';

/**
 * Boot fixture (PRQ-17 T1, M3c1). Navigates to baseURL, waits for
 * the Landing surface to render, optionally enters the game.
 *
 * Empty-string `goto('')` is intentional — it resolves to baseURL
 * exactly. `goto('/')` would drop the GitHub Pages base path on
 * deployed runs. The `query` option appends to baseURL so the
 * `?test=1` debug-namespace gate survives the navigation.
 */

export interface BootOptions {
	/** Click CLOCK IN and wait for the game canvas. Default false. */
	enterGame?: boolean;
	/** Max ms to wait for the canvas after CLOCK IN. Default 10s. */
	timeoutMs?: number;
	/** Query string to append (e.g. `?test=1`). Empty = baseURL only. */
	query?: string;
}

export async function bootGame(page: Page, opts: BootOptions = {}): Promise<void> {
	const timeout = opts.timeoutMs ?? 10_000;
	await page.goto(opts.query ?? '');
	await page.getByTestId('landing').waitFor({ state: 'visible', timeout });
	if (opts.enterGame) {
		await page.getByTestId('clock-in').click();
		await page.getByTestId('game').waitFor({ state: 'visible', timeout });
	}
}
