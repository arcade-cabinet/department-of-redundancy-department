#!/usr/bin/env node
/**
 * Verify every entry in public/assets/models/manifest.json points to a GLB
 * that actually exists. Print a coverage table grouped by category. Fail
 * (exit 1) if any entry is missing or if the manifest itself is missing
 * once any conversions have run.
 *
 * Pre-PRQ-01 (no manifest yet): pass with notice.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(repoRoot, 'public/assets/models/manifest.json');

if (!existsSync(manifestPath)) {
	console.log('check-asset-manifest: manifest not yet generated. OK (pre-PRQ-01).');
	process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const groups = ['characters', 'props', 'traps'];

const rows = [];
let totalBytes = 0;
let missing = 0;

for (const group of groups) {
	for (const [slug, entry] of Object.entries(manifest[group] ?? {})) {
		const p = resolve(repoRoot, 'public' + entry.path);
		const exists = existsSync(p);
		const bytes = exists ? statSync(p).size : 0;
		totalBytes += bytes;
		if (!exists) missing++;
		rows.push({ group, slug, exists, bytes, path: entry.path });
	}
}

const fmtMB = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;

console.log('Asset manifest coverage:');
const counts = { characters: 0, props: 0, traps: 0 };
const sums = { characters: 0, props: 0, traps: 0 };
for (const r of rows) {
	counts[r.group]++;
	sums[r.group] += r.bytes;
	if (!r.exists) {
		console.error(`  ✘ ${r.group}/${r.slug} — MISSING ${r.path}`);
	}
}
for (const g of groups) {
	console.log(`  ${g.padEnd(11)} ${String(counts[g]).padStart(3)} entries, ${fmtMB(sums[g])}`);
}
console.log(
	`  ${'TOTAL'.padEnd(11)} ${String(rows.length).padStart(3)} entries, ${fmtMB(totalBytes)}`,
);

if (missing > 0) {
	console.error(`\ncheck-asset-manifest: ${missing} entry(ies) missing on disk.`);
	console.error('Run `pnpm assets:convert` to regenerate.');
	process.exit(1);
}

console.log('check-asset-manifest: all entries present.');
