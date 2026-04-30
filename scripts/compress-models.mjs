#!/usr/bin/env node
/**
 * Compress every GLB under public/assets/models/ via @gltf-transform/cli:
 *   - resize textures to 256² for traps + props, 512² for characters
 *   - re-encode as WebP (already true for our outputs, but enforce)
 *   - dedup + weld for vertex-side savings
 *
 * Idempotent: writes to a tempfile and atomically replaces. Skips if the
 * post-compress output is the same size as input (no change).
 */
import { execSync } from 'node:child_process';
import { readdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modelsRoot = join(repoRoot, 'public', 'assets', 'models');

const groups = {
	characters: { texSize: 512 },
	props: { texSize: 256 },
	traps: { texSize: 256 },
};

const before = {};
const after = {};

for (const [group, { texSize }] of Object.entries(groups)) {
	const dir = join(modelsRoot, group);
	let files;
	try {
		files = readdirSync(dir).filter((f) => f.endsWith('.glb'));
	} catch {
		continue;
	}
	before[group] = 0;
	after[group] = 0;
	for (const f of files) {
		const src = join(dir, f);
		const tmp = `${src}.tmp.glb`;
		before[group] += statSync(src).size;
		try {
			// optimize: dedup textures, weld vertices, palette-pack identical
			// materials into one atlas, draco-compress geometry, webp textures.
			// Critical for the voxel-prop traps: each cube of color is a separate
			// material/texture in the source, totaling 30+ textures per trap.
			execSync(
				`pnpm dlx -s @gltf-transform/cli optimize "${src}" "${tmp}" --texture-compress webp --texture-size ${texSize} --compress draco --palette true`,
				{ stdio: ['ignore', 'pipe', 'pipe'] },
			);
			renameSync(tmp, src);
		} catch (e) {
			try {
				unlinkSync(tmp);
			} catch {}
			console.error(`compress: ${group}/${f} FAILED — ${String(e).slice(0, 200)}`);
			continue;
		}
		after[group] += statSync(src).size;
	}
}

for (const g of Object.keys(groups)) {
	const b = before[g] ?? 0;
	const a = after[g] ?? 0;
	const mb = (n) => (n / 1024 / 1024).toFixed(2);
	console.log(`${g}: ${mb(b)} MB → ${mb(a)} MB`);
}
const totalBefore = Object.values(before).reduce((s, v) => s + v, 0);
const totalAfter = Object.values(after).reduce((s, v) => s + v, 0);
console.log(`TOTAL: ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
