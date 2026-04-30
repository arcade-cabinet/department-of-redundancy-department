import path from 'node:path';
import { defineConfig } from 'vite';

const isPages = process.env.GITHUB_PAGES === 'true';
const isCapacitor = process.env.CAPACITOR === 'true';

export default defineConfig({
	base: isPages ? '/department-of-redundancy-department/' : '/',
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
		port: 5173,
		strictPort: false,
	},
	publicDir: path.resolve(__dirname, 'public'),
	build: {
		outDir: path.resolve(__dirname, 'dist'),
		emptyOutDir: true,
		sourcemap: !isCapacitor,
		target: 'es2023',
	},
});
