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
	build: {
		outDir: 'dist',
		sourcemap: !isCapacitor,
		target: 'es2023',
		rollupOptions: {
			input: path.resolve(__dirname, 'app/index.html'),
		},
	},
	optimizeDeps: {
		exclude: ['sql.js'],
	},
});
