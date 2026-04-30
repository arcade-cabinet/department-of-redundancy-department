#!/usr/bin/env node
/**
 * Curate sound packs from `references/` into `public/assets/audio/`.
 *
 * Each entry in CURATION below names:
 *   - `pack`: directory under references/ to consume
 *   - `srcSubdir`: which of the pack's format subdirs to pull from
 *     (we prefer OGG; fall back to MP3 when the pack ships only MP3)
 *   - `dest`: target subdir under public/assets/audio/
 *   - `picks`: explicit (sourceBasename → destSlug) mapping. Keeps the
 *     output deterministic + small (mobile-first), naming each file by
 *     the slug the runtime already references via `audioManager.play()`
 *     and `wireAudioCues`.
 *
 * After running, every consumed pack's source files should be unused —
 * `cleanup-references.sh` deletes the dirs in a separate step.
 *
 * Re-runnable: skips files already at the destination with matching size.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const referencesRoot = join(repoRoot, 'references');
const audioRoot = join(repoRoot, 'public', 'assets', 'audio');

const CURATION = [
	// AMBIENCE — four threat-tier loops. Slug names mirror
	// src/audio/ambience.ts:AmbienceLayer so audioManager.play(`ambience-${layer}`)
	// resolves directly. PSX office-coded picks: dungeon=quiet office hum;
	// machine=server-room hum; factory=printer-room buzz; storm=alarm-state
	// stress fill.
	{
		pack: 'Ultimate_Game_Ambient_Sound_Effects_Pack',
		srcSubdir: 'OGG',
		dest: 'ambience',
		picks: {
			'pl_ambient_dungeon_01.ogg': 'ambience-managers-only.ogg',
			'pl_ambient_machine_02.ogg': 'ambience-radio-chatter.ogg',
			'pl_ambient_factory_01.ogg': 'ambience-boots-thump.ogg',
			'pl_ambient_storm_03.ogg': 'ambience-tense-drone.ogg',
		},
	},

	// FOOTSTEPS — six surface variants × three pitch-shift instances each.
	// The runtime fires `footstep-<surface>-<NN>` per step; the surface is
	// classified from the block under the player. Carpet+wood+metal cover
	// every voxel surface in the office; armor variants tag boss/swat
	// footsteps; jump+land for vertical traversal.
	{
		pack: 'footsteps_sound_effects_pack',
		srcSubdir: 'OGG',
		dest: 'footsteps',
		picks: {
			'pl_footstep_wood_01.ogg': 'footstep-carpet-01.ogg',
			'pl_footstep_wood_02.ogg': 'footstep-carpet-02.ogg',
			'pl_footstep_wood_03.ogg': 'footstep-carpet-03.ogg',
			'pl_footstep_stone_01.ogg': 'footstep-tile-01.ogg',
			'pl_footstep_stone_02.ogg': 'footstep-tile-02.ogg',
			'pl_footstep_stone_03.ogg': 'footstep-tile-03.ogg',
			'pl_footstep_metal_01.ogg': 'footstep-metal-01.ogg',
			'pl_footstep_metal_02.ogg': 'footstep-metal-02.ogg',
			'pl_footstep_metal_03.ogg': 'footstep-metal-03.ogg',
			'pl_armor_step_01.ogg': 'footstep-armor-01.ogg',
			'pl_armor_step_02.ogg': 'footstep-armor-02.ogg',
			'pl_armor_step_03.ogg': 'footstep-armor-03.ogg',
			'pl_jump_01.ogg': 'jump-01.ogg',
			'pl_jump_02.ogg': 'jump-02.ogg',
			'pl_land_01.ogg': 'land-01.ogg',
			'pl_land_02.ogg': 'land-02.ogg',
		},
	},

	// IMPACTS — combat hit feedback. body=on enemy hit; metal=on metal
	// surface hits; wood=on placed-block hits; heavy=boss/swat hits;
	// punch=melee. Three variants each so the runtime can pick at random
	// per fire to reduce repetition.
	{
		pack: 'Impact_Hit_Sound_Effects_Pack',
		srcSubdir: 'OGG',
		dest: 'impact',
		picks: {
			'pl_impact_body_01.ogg': 'impact-body-01.ogg',
			'pl_impact_body_02.ogg': 'impact-body-02.ogg',
			'pl_impact_body_03.ogg': 'impact-body-03.ogg',
			'pl_impact_metal_01.ogg': 'impact-metal-01.ogg',
			'pl_impact_metal_02.ogg': 'impact-metal-02.ogg',
			'pl_impact_metal_03.ogg': 'impact-metal-03.ogg',
			'pl_impact_wood_01.ogg': 'impact-wood-01.ogg',
			'pl_impact_wood_02.ogg': 'impact-wood-02.ogg',
			'pl_impact_wood_03.ogg': 'impact-wood-03.ogg',
			'pl_impact_heavy_01.ogg': 'impact-heavy-01.ogg',
			'pl_impact_heavy_02.ogg': 'impact-heavy-02.ogg',
			'pl_impact_punch_01.ogg': 'impact-punch-01.ogg',
			'pl_impact_punch_02.ogg': 'impact-punch-02.ogg',
		},
	},

	// EXPLOSIONS — for grenade-class enemies + traps. Small for the
	// paper-shredder, medium for the falling-monitor, big for HR Reaper
	// telegraph. Debris layer plays on top.
	{
		pack: 'Game_Explosion_Sound_Effects_Pack',
		srcSubdir: 'MP3',
		dest: 'explosion',
		picks: {
			'pl_explosion_small_01.mp3': 'explosion-small-01.mp3',
			'pl_explosion_small_02.mp3': 'explosion-small-02.mp3',
			'pl_explosion_medium_01.mp3': 'explosion-medium-01.mp3',
			'pl_explosion_medium_02.mp3': 'explosion-medium-02.mp3',
			'pl_explosion_big_01.mp3': 'explosion-big-01.mp3',
			'pl_explosion_debris_01.mp3': 'explosion-debris.mp3',
		},
	},

	// INVENTORY — pickup feedback. The PickupKind cues map directly to
	// these slugs from useFrameWeaponTick + onPickupCollect.
	{
		pack: 'Inventory_And_Item_Sound_Effects_Pack',
		srcSubdir: 'OGG',
		dest: 'inventory',
		picks: {
			'pl_item_pickup_01.ogg': 'pickup-binder-clips.ogg',
			'pl_potion_pickup_01.ogg': 'pickup-coffee.ogg',
			'pl_loot_pickup_01.ogg': 'pickup-donut.ogg',
			'pl_chest_loot_01.ogg': 'pickup-briefcase.ogg',
			'pl_item_equip_01.ogg': 'weapon-equip.ogg',
			'pl_item_unequip_01.ogg': 'weapon-unequip.ogg',
			'pl_item_drop_01.ogg': 'item-drop.ogg',
			'inventory_open_01.ogg': 'inventory-open.ogg',
			'pl_inventory_close_01.ogg': 'inventory-close.ogg',
			'pl_inventory_error_01.ogg': 'inventory-error.ogg',
			'pl_craft_success_01.ogg': 'craft-success.ogg',
			'pl_craft_fail_01.ogg': 'craft-fail.ogg',
		},
	},

	// UI — menu/HUD cues. Feeds the radial menu, pause-menu buttons,
	// landing-page CLOCK IN.
	{
		pack: 'PixelLoops_UI_Sound_Effects_Pack',
		srcSubdir: 'MP3',
		dest: 'ui',
		picks: {
			'ui_pl_Click_01.mp3': 'ui-click.mp3',
			'ui_pl_Confirm_01.mp3': 'ui-confirm.mp3',
			'ui_pl_Cancel_01.mp3': 'ui-cancel.mp3',
			'ui_pl_Hover_01.mp3': 'ui-hover.mp3',
			'ui_pl_Error_01.mp3': 'ui-error.mp3',
			'ui_pl_Notification_01.mp3': 'ui-notification.mp3',
			'ui_pl_Popup_01.mp3': 'ui-popup.mp3',
			'ui_pl_Unlock_01.mp3': 'ui-unlock.mp3',
			'ui_pl_achievement_01.mp3': 'ui-achievement.mp3',
		},
	},

	// STINGERS — six victory signatures. Floor-cleared = short; boss-
	// cleared = epic; level-up = bright; 100%-clear = mega. The
	// runtime picks one per event class.
	{
		pack: 'Victory_Level_Complete_Music_Pack_24_Stingers_PixelLoops',
		srcSubdir: 'MP3',
		dest: 'stinger',
		picks: {
			'pl_vlc_victory_01_short.mp3': 'stinger-floor-cleared.mp3',
			'pl_vlc_victory_02_bright.mp3': 'stinger-bright.mp3',
			'pl_vlc_victory_07_success.mp3': 'stinger-success.mp3',
			'pl_vlc_victory_09_levelup.mp3': 'stinger-level-up.mp3',
			'pl_vlc_victory_19_epic.mp3': 'stinger-boss-cleared.mp3',
			'pl_vlc_victory_24_mega.mp3': 'stinger-100-percent.mp3',
		},
	},
];

let copied = 0;
let skipped = 0;
let missing = 0;
const sourceManifest = [];

for (const entry of CURATION) {
	const srcDir = join(referencesRoot, entry.pack, entry.srcSubdir);
	const destDir = join(audioRoot, entry.dest);
	mkdirSync(destDir, { recursive: true });
	if (!existsSync(srcDir)) {
		console.warn(`[curate-audio] missing source dir: ${srcDir}`);
		continue;
	}
	const sourceFiles = new Set(readdirSync(srcDir));
	for (const [src, slug] of Object.entries(entry.picks)) {
		if (!sourceFiles.has(src)) {
			console.warn(`[curate-audio] missing ${entry.pack}/${entry.srcSubdir}/${src}`);
			missing++;
			continue;
		}
		const srcPath = join(srcDir, src);
		const destPath = join(destDir, slug);
		const srcSize = statSync(srcPath).size;
		if (existsSync(destPath) && statSync(destPath).size === srcSize) {
			skipped++;
		} else {
			copyFileSync(srcPath, destPath);
			copied++;
		}
		sourceManifest.push({ pack: entry.pack, src, slug: `${entry.dest}/${slug}` });
	}
}

console.log(`[curate-audio] copied=${copied} skipped=${skipped} missing=${missing}`);
console.log(
	`[curate-audio] total=${sourceManifest.length} files into ${audioRoot.replace(repoRoot, '.')}`,
);

if (missing > 0) process.exit(1);
