#!/usr/bin/env node
// Mechanical guarantee that the dev-only cheat surfaces tree-shake from
// production bundles. main.ts gates them behind `IS_DEV` (Vite folds
// `import.meta.env.PROD` to `true` in prod, making `IS_DEV` the literal
// `false`); Rollup DCE then drops the gated branch and the global init.
// If this script ever finds a forbidden symbol in `dist/`, the gate has
// regressed and the cheat ships.
//
// `__DORD_DEV_SURFACE_MARKER__` is a sentinel inside the same `IS_DEV`
// block as `__dord` (which carries `hitEnemy`, `isJusticeWindowOpen`,
// `jumpToLevel`, etc.). If the marker appears in dist/, the entire
// dev surface shipped — even though common method names like
// `hitEnemy` cannot be banned individually (they're also legit
// production methods on EncounterDirector).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = ['__dordGod', 'dordGod', '__DORD_DEV_SURFACE_MARKER__'];
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
