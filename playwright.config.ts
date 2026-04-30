import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.DORD_BASE_URL ?? 'http://127.0.0.1:5173/';
const isExternalTarget =
	!baseURL.startsWith('http://127.0.0.1') && !baseURL.startsWith('http://localhost');

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
