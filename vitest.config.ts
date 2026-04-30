import path from 'node:path';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@app': path.resolve(__dirname, './app'),
		},
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'node',
					environment: 'node',
					include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
					exclude: ['**/*.browser.test.ts', '**/*.browser.test.tsx'],
				},
			},
			{
				extends: true,
				test: {
					name: 'browser',
					include: [
						'src/**/*.browser.test.ts',
						'app/**/*.browser.test.tsx',
						'src/**/*.browser.test.tsx',
					],
					browser: {
						enabled: true,
						provider: playwright(),
						headless: true,
						instances: [{ browser: 'chromium' }],
					},
				},
			},
		],
	},
});
