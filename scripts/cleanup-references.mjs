#!/usr/bin/env node
/**
 * Delete consumed reference packs. Verifies their canonical destination
 * files exist FIRST, so we never strand a half-curated pack.
 *
 * Each entry names the pack dir under references/ and a list of files
 * (under public/assets/) that must exist before the pack can be removed.
 *
 * Run: node scripts/cleanup-references.mjs            (dry run, lists)
 *      node scripts/cleanup-references.mjs --delete    (actually rm -rf)
 */
import { existsSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const referencesRoot = join(repoRoot, 'references');
const publicRoot = join(repoRoot, 'public', 'assets');

const PACKS = [
	{
		dir: 'Ultimate_Game_Ambient_Sound_Effects_Pack',
		requires: [
			'audio/ambience/ambience-managers-only.ogg',
			'audio/ambience/ambience-radio-chatter.ogg',
			'audio/ambience/ambience-boots-thump.ogg',
			'audio/ambience/ambience-tense-drone.ogg',
		],
	},
	{
		dir: 'footsteps_sound_effects_pack',
		requires: [
			'audio/footsteps/footstep-carpet-01.ogg',
			'audio/footsteps/footstep-tile-01.ogg',
			'audio/footsteps/footstep-metal-01.ogg',
			'audio/footsteps/footstep-armor-01.ogg',
			'audio/footsteps/jump-01.ogg',
			'audio/footsteps/land-01.ogg',
		],
	},
	{
		dir: 'Impact_Hit_Sound_Effects_Pack',
		requires: [
			'audio/impact/impact-body-01.ogg',
			'audio/impact/impact-metal-01.ogg',
			'audio/impact/impact-wood-01.ogg',
			'audio/impact/impact-heavy-01.ogg',
			'audio/impact/impact-punch-01.ogg',
		],
	},
	{
		dir: 'Game_Explosion_Sound_Effects_Pack',
		requires: [
			'audio/explosion/explosion-small-01.mp3',
			'audio/explosion/explosion-medium-01.mp3',
			'audio/explosion/explosion-big-01.mp3',
			'audio/explosion/explosion-debris.mp3',
		],
	},
	{
		dir: 'Inventory_And_Item_Sound_Effects_Pack',
		requires: [
			'audio/inventory/pickup-binder-clips.ogg',
			'audio/inventory/pickup-coffee.ogg',
			'audio/inventory/pickup-donut.ogg',
			'audio/inventory/pickup-briefcase.ogg',
			'audio/inventory/weapon-equip.ogg',
			'audio/inventory/inventory-open.ogg',
		],
	},
	{
		dir: 'PixelLoops_UI_Sound_Effects_Pack',
		requires: [
			'audio/ui/ui-click.mp3',
			'audio/ui/ui-confirm.mp3',
			'audio/ui/ui-cancel.mp3',
			'audio/ui/ui-hover.mp3',
		],
	},
	{
		dir: 'Victory_Level_Complete_Music_Pack_24_Stingers_PixelLoops',
		requires: [
			'audio/stinger/stinger-floor-cleared.mp3',
			'audio/stinger/stinger-boss-cleared.mp3',
			'audio/stinger/stinger-level-up.mp3',
		],
	},
	{
		dir: 'Stylized Guns 3D Models PRO',
		requires: [
			'models/weapons/weapon-ak47.glb',
			'models/weapons/weapon-shotgun.glb',
			'models/weapons/weapon-mac10.glb',
			'models/weapons/weapon-bazooka.glb',
			'models/weapons/weapon-flamethrower.glb',
			'models/weapons/weapon-mgd-pm9.glb',
		],
	},
	{
		dir: 'PSX Hands',
		requires: ['models/hands/fps-arms.glb'],
	},
	{
		dir: 'Retro Textures 2',
		requires: [
			'textures/retro/doors', // dir presence
			'textures/retro/shutters',
			'textures/retro/windows',
		],
	},
];

const dryRun = !process.argv.includes('--delete');
let okCount = 0;
let blockedCount = 0;
let removedBytes = 0;

import { readdirSync as _readdir } from 'node:fs';

function dirSizeSync(p) {
	if (!existsSync(p)) return 0;
	const st = statSync(p);
	if (!st.isDirectory()) return st.size;
	let total = 0;
	for (const e of _readdir(p)) total += dirSizeSync(join(p, e));
	return total;
}

console.log(`mode: ${dryRun ? 'DRY RUN' : 'DELETE'}`);
console.log('');
for (const pack of PACKS) {
	const srcDir = join(referencesRoot, pack.dir);
	if (!existsSync(srcDir)) {
		console.log(`  [skip ] ${pack.dir} (already removed)`);
		continue;
	}
	const missing = pack.requires.filter((r) => !existsSync(join(publicRoot, r)));
	const sz = dirSizeSync(srcDir);
	if (missing.length) {
		console.log(
			`  [BLOCK] ${pack.dir} (${(sz / 1024 / 1024).toFixed(1)} MB) — missing curated outputs:`,
		);
		for (const m of missing) console.log(`            ${m}`);
		blockedCount++;
		continue;
	}
	if (dryRun) {
		console.log(`  [ok   ] ${pack.dir} (${(sz / 1024 / 1024).toFixed(1)} MB) — would delete`);
	} else {
		rmSync(srcDir, { recursive: true, force: true });
		console.log(`  [DEL  ] ${pack.dir} (${(sz / 1024 / 1024).toFixed(1)} MB)`);
		removedBytes += sz;
	}
	okCount++;
}

console.log('');
console.log(`packs ok: ${okCount}, blocked: ${blockedCount}`);
if (!dryRun && removedBytes > 0)
	console.log(`reclaimed: ${(removedBytes / 1024 / 1024).toFixed(1)} MB`);
if (dryRun && okCount > 0) console.log('Run with --delete to actually remove.');
