#!/usr/bin/env node
/**
 * Copy sql.js wasm + jeep-sqlite assets into `public/wasm/` so the
 * web adapter (src/db/client.web.ts) can load them at runtime via
 * `/wasm/sql-wasm.wasm`. Run pre-dev/build via the `prepare:public`
 * npm hook.
 *
 * Why copy instead of import: sql.js's wasm binary is ~600KB and not
 * tree-shakable; Vite would bundle it as a base64 string in the JS
 * chunk. Serving from `/wasm/` lets the browser stream the binary in
 * parallel with the JS bundle and keeps the code-only chunk small.
 *
 * Idempotent: skips files unchanged on disk.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(repoRoot, 'public/wasm');
mkdirSync(target, { recursive: true });

// (sourcePath, destFilename) pairs. Vite's dep optimizer may resolve
// sql.js's `browser` exports condition, which calls locateFile with
// 'sql-wasm-browser.wasm'. Copy both so either path works.
const FILES = [
	['node_modules/sql.js/dist/sql-wasm.wasm', 'sql-wasm.wasm'],
	['node_modules/sql.js/dist/sql-wasm-browser.wasm', 'sql-wasm-browser.wasm'],
];

let copied = 0;
let skipped = 0;
for (const [src, destName] of FILES) {
	const srcAbs = resolve(repoRoot, src);
	const destAbs = resolve(target, destName);
	if (!existsSync(srcAbs)) {
		console.error(`copy-wasm: missing source ${src} — run \`pnpm install\` first.`);
		process.exit(1);
	}
	const srcSize = statSync(srcAbs).size;
	if (existsSync(destAbs) && statSync(destAbs).size === srcSize) {
		// Cheap content check: identical size + non-zero is a strong signal
		// for our use case (binary asset, no in-place editing). If one ever
		// gets corrupted, deleting the target file forces a fresh copy.
		skipped++;
		continue;
	}
	copyFileSync(srcAbs, destAbs);
	copied++;
}
console.log(`copy-wasm: ${copied} copied, ${skipped} skipped → public/wasm/`);
// Help diagnose silent corruption.
const finalSize = statSync(resolve(target, 'sql-wasm.wasm')).size;
if (finalSize < 100 * 1024) {
	console.error(`copy-wasm: sql-wasm.wasm too small (${finalSize}B) — likely corrupted.`);
	process.exit(1);
}
// Suppress unused-import warning when readFileSync isn't called this run.
void readFileSync;
