#!/usr/bin/env node
/**
 * Curate Retro Textures 2 (doors, shutters, windows) into
 * public/assets/textures/retro/. These are PSX-era prop textures we'll
 * use for door panels, window cubicles, and decorative shutters in M5
 * BETA-POLISH archetype variation.
 *
 * Mobile-first: keep all textures (they're already small PNGs, ≤ 256px
 * typical), preserve their original names so a future BlockRegistry
 * entry can pick the variant by index.
 *
 * Re-runnable: skips files unchanged on disk.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = join(repoRoot, 'references', 'Retro Textures 2');
const destRoot = join(repoRoot, 'public', 'assets', 'textures', 'retro');

const SUBDIRS = ['Doors', 'Shutters', 'Windows'];

let copied = 0;
let skipped = 0;
const manifest = [];

for (const sub of SUBDIRS) {
	const srcDir = join(srcRoot, sub);
	const destDir = join(destRoot, sub.toLowerCase());
	if (!existsSync(srcDir)) {
		console.warn(`[curate-textures] missing ${srcDir}`);
		continue;
	}
	mkdirSync(destDir, { recursive: true });
	for (const file of readdirSync(srcDir)) {
		if (!/\.(png|jpg)$/i.test(file)) continue;
		const srcPath = join(srcDir, file);
		const destPath = join(destDir, file);
		const srcSize = statSync(srcPath).size;
		if (existsSync(destPath) && statSync(destPath).size === srcSize) {
			skipped++;
		} else {
			copyFileSync(srcPath, destPath);
			copied++;
		}
		manifest.push(`${sub.toLowerCase()}/${file}`);
	}
}

console.log(`[curate-textures] copied=${copied} skipped=${skipped} total=${manifest.length}`);
console.log(`[curate-textures] dest: ${destRoot.replace(repoRoot, '.')}`);
