import path from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	optimizeDeps: {
		include: [
			'@babylonjs/core/Audio/sound',
			'@babylonjs/core/Engines/engine',
			'@babylonjs/core/Engines/nullEngine',
			'@babylonjs/core/Misc/observable',
			'@babylonjs/core/scene',
		],
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'node',
					environment: 'node',
					include: ['src/**/*.test.ts'],
				},
			},
			{
				extends: true,
				test: {
					name: 'audio',
					include: ['tests/audio/**/*.test.ts'],
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
