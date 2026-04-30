import { defineConfig, devices } from '@playwright/test';

// Trim trailing slash so spec calls like page.goto('/') resolve to <base>/
// instead of <origin>/ when baseURL contains a path prefix (Pages deploy).
const rawBase = process.env.DORD_BASE_URL ?? 'http://localhost:5173/';
const baseURL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const isExternalTarget =
	!baseURL.startsWith('http://localhost') && !baseURL.startsWith('http://127.0.0.1');

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	...(process.env.CI ? { workers: 2 } : {}),
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	...(isExternalTarget
		? {}
		: {
				webServer: {
					command: 'pnpm preview --port 5173',
					port: 5173,
					reuseExistingServer: !process.env.CI,
					timeout: 120_000,
				},
			}),
});
