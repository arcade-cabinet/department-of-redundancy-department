import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for DORD e2e + visual tests.
 *
 * Determinism rules per `profiles/ts-browser-game.md`:
 *   - `retries: 0` — flake means determinism is broken; fix the engine, not the suite.
 *   - `animations: 'disabled'` everywhere.
 *   - One worker for visual baselines: parallel snapshot capture races the GPU.
 *
 * The webServer block boots `pnpm dev` on :5173 and waits for it before
 * running specs. CI uses `reuseExistingServer: !process.env.CI` so local runs
 * attach to a long-lived dev server while CI always boots a fresh one.
 */
export default defineConfig({
	testDir: 'tests',
	testMatch: ['**/*.spec.ts'],
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
	timeout: 60_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'pnpm dev --port 5173',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
