#!/usr/bin/env node
// Copies sql.js + rapier WASM into public/wasm/. Stubbed in PRQ-00; populated in PRQ-04.
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve(process.cwd(), 'public/wasm');
if (!existsSync(target)) {
	mkdirSync(target, { recursive: true });
	console.log('Created public/wasm/');
}
console.log('copy-wasm: nothing to copy yet (populated in PRQ-04).');
