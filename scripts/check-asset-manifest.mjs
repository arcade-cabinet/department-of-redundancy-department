#!/usr/bin/env node
// Verifies every entry in public/assets/models/manifest.json points to an existing GLB.
// In PRQ-00 the manifest does not yet exist — pass with a notice.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve(process.cwd(), 'public/assets/models/manifest.json');
if (!existsSync(manifestPath)) {
	console.log('check-asset-manifest: manifest not yet generated (PRQ-01 produces it). OK.');
	process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const groups = ['characters', 'props', 'traps'];
let missing = 0;
for (const group of groups) {
	for (const [slug, entry] of Object.entries(manifest[group] ?? {})) {
		const p = resolve(process.cwd(), 'public' + entry.path);
		if (!existsSync(p)) {
			console.error(`MISSING: ${group}/${slug} → ${entry.path}`);
			missing++;
		}
	}
}
if (missing > 0) {
	console.error(`check-asset-manifest: ${missing} missing GLB(s).`);
	process.exit(1);
}
console.log('check-asset-manifest: all manifest entries present.');
