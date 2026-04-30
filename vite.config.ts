import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const isPages = process.env.GITHUB_PAGES === 'true';
const isCapacitor = process.env.CAPACITOR === 'true';

export default defineConfig({
	base: isPages ? '/department-of-redundancy-department/' : '/',
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@app': path.resolve(__dirname, './app'),
		},
	},
	server: {
		port: 5173,
		strictPort: false,
	},
	root: 'app',
	publicDir: path.resolve(__dirname, 'public'),
	build: {
		outDir: path.resolve(__dirname, 'dist'),
		emptyOutDir: true,
		sourcemap: !isCapacitor,
		target: 'es2023',
	},
	optimizeDeps: {
		// sql.js is UMD; letting Vite pre-bundle it via esbuild produces a
		// proper ESM wrapper with a default export (the original `exclude`
		// caused the raw UMD to be served without globals, leaving the
		// runtime with an empty module record).
		include: ['sql.js'],
	},
});
