#!/usr/bin/env node
// Mechanical guarantee that the dev-only `__dordGod` cheat surface
// tree-shakes from production bundles. main.ts gates the cheat behind
// `IS_DEV` (Vite folds `import.meta.env.PROD` to `true` in prod, making
// `IS_DEV` the literal `false`); Rollup DCE then drops the gated branch
// and the global init. If this script ever finds the symbol in `dist/`,
// the gate has regressed and the cheat ships.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = ['__dordGod', 'dordGod'];
const DIST = 'dist';

function* walk(dir) {
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		const s = statSync(p);
		if (s.isDirectory()) yield* walk(p);
		else yield p;
	}
}

let hits = 0;
for (const file of walk(DIST)) {
	if (!/\.(js|mjs|cjs|html)$/.test(file)) continue;
	const text = readFileSync(file, 'utf8');
	for (const needle of FORBIDDEN) {
		if (text.includes(needle)) {
			console.error(`[assert-no-cheats] FOUND "${needle}" in ${file}`);
			hits++;
		}
	}
}

if (hits > 0) {
	console.error(
		`[assert-no-cheats] FAIL — ${hits} hit(s). The dev cheat surface leaked into the production bundle.`,
	);
	process.exit(1);
}
console.log('[assert-no-cheats] OK — no dev cheat symbols in dist/.');
