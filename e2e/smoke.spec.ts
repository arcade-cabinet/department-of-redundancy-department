import { expect, test } from '@playwright/test';

test('@golden landing page renders and CLOCK IN navigates to game canvas', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('landing')).toBeVisible();
	await expect(page.getByText(/Department of Redundancy Department/i)).toBeVisible();
	await page.getByTestId('clock-in').click();
	await expect(page.getByTestId('game')).toBeVisible();
});

test('@perf landing renders within budget', async ({ page }) => {
	const start = Date.now();
	await page.goto('/');
	await expect(page.getByTestId('landing')).toBeVisible();
	const elapsed = Date.now() - start;
	expect(elapsed).toBeLessThan(5_000);
});
