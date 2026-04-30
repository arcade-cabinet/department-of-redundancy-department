import { expect, test } from '@playwright/test';

test('@golden landing page renders and CLOCK IN navigates to game canvas', async ({ page }) => {
	await page.goto(''); // empty resolves to baseURL exactly — '/' would drop the Pages base path
	await expect(page.getByTestId('landing')).toBeVisible();
	// Title is split across two lines with <br/> — match each separately.
	await expect(page.getByRole('heading')).toContainText(/Department of/i);
	await expect(page.getByRole('heading')).toContainText(/Redundancy Department/i);
	await page.getByTestId('clock-in').click();
	await expect(page.getByTestId('game')).toBeVisible();
});

test('@perf landing renders within budget', async ({ page }) => {
	const start = Date.now();
	await page.goto(''); // empty resolves to baseURL exactly — '/' would drop the Pages base path
	await expect(page.getByTestId('landing')).toBeVisible();
	const elapsed = Date.now() - start;
	expect(elapsed).toBeLessThan(5_000);
});
