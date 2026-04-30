#!/usr/bin/env node
/**
 * Build the voxel block tileset atlas at
 * `public/assets/textures/blocks-tileset.webp`.
 *
 * Inputs: PolyHaven Diffuse maps already in `public/assets/textures/`
 * (carpet, ceiling-tile, drywall, laminate, whiteboard). For slots with
 * no real source texture (cubicle-wall, door-frame, supply-metal, the
 * placed-* family), we synthesize a flat-tinted procedural tile so the
 * voxel demo reads correctly even before art passes.
 *
 * Output layout: 4×4 grid of 256×256 tiles → 1024×1024 webp. Slot order
 * mirrors `src/world/blocks/tileset.ts:TILESET_SLOTS` exactly. Bottom row
 * is index 0..3, next row up is 4..7, etc., because three.js UV space
 * is origin-bottom-left.
 *
 * Idempotent: regenerating produces a byte-stable atlas (sharp's webp
 * encoder is deterministic for the same inputs).
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..');
const texDir = join(repoRoot, 'public', 'assets', 'textures');
const outPath = join(texDir, 'blocks-tileset.webp');

const TILE = 256;
const GRID = 4;
const ATLAS = TILE * GRID;

// Maps each TilesetSlot to either a source path (relative to texDir) or
// a synth recipe. MUST match the index order in
// src/world/blocks/tileset.ts:TILESET_SLOTS.
const SLOTS = [
	{ name: 'air', synth: { r: 0, g: 0, b: 0, a: 0 } },
	{ name: 'carpet', src: 'carpet/carpet_Diffuse_2k.jpg' },
	{ name: 'ceiling-tile', src: 'ceiling-tile/ceiling-tile_Diffuse_2k.jpg' },
	{ name: 'cubicle-wall', synth: { r: 132, g: 124, b: 108, a: 255 } },
	{ name: 'drywall', src: 'drywall/drywall_Diffuse_2k.jpg' },
	{ name: 'laminate', src: 'laminate/laminate_Diffuse_2k.jpg' },
	{ name: 'whiteboard', src: 'whiteboard/whiteboard_Diffuse_2k.jpg' },
	{ name: 'door-frame', synth: { r: 220, g: 215, b: 200, a: 255 } },
	{ name: 'supply-metal', synth: { r: 168, g: 172, b: 178, a: 255 } },
	{ name: 'placed-stair', synth: { r: 232, g: 196, b: 60, a: 255 } },
	{ name: 'placed-wall', src: 'drywall/drywall_Diffuse_2k.jpg' },
	{ name: 'placed-desk', src: 'laminate/laminate_Diffuse_2k.jpg' },
	{ name: 'placed-terminal', synth: { r: 60, g: 116, b: 196, a: 255 } },
	{ name: 'reserved-13', synth: { r: 32, g: 32, b: 32, a: 255 } },
	{ name: 'reserved-14', synth: { r: 32, g: 32, b: 32, a: 255 } },
	{ name: 'reserved-15', synth: { r: 32, g: 32, b: 32, a: 255 } },
];

if (SLOTS.length !== GRID * GRID) {
	console.error(`SLOTS length ${SLOTS.length} ≠ grid ${GRID * GRID}`);
	process.exit(1);
}

async function tileFor(slot) {
	if (slot.synth) {
		const { r, g, b, a } = slot.synth;
		return sharp({
			create: { width: TILE, height: TILE, channels: 4, background: { r, g, b, alpha: a / 255 } },
		})
			.png()
			.toBuffer();
	}
	const src = join(texDir, slot.src);
	if (!existsSync(src)) {
		console.error(`missing source for ${slot.name}: ${src}`);
		process.exit(1);
	}
	return sharp(src).resize(TILE, TILE, { fit: 'cover' }).png().toBuffer();
}

async function main() {
	console.log(`tileset → ${outPath}`);
	const tiles = await Promise.all(SLOTS.map(tileFor));
	// Compose: index 0 = row 0 col 0, but row 0 in OUR convention is the
	// BOTTOM row of the image (UV origin-bottom-left). So row N pixel-y is
	// (GRID-1-N) * TILE.
	const composites = [];
	for (let i = 0; i < SLOTS.length; i++) {
		const col = i % GRID;
		const row = Math.floor(i / GRID);
		const pixelTop = (GRID - 1 - row) * TILE;
		const pixelLeft = col * TILE;
		composites.push({ input: tiles[i], top: pixelTop, left: pixelLeft });
	}

	await sharp({
		create: {
			width: ATLAS,
			height: ATLAS,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	})
		.composite(composites)
		.webp({ quality: 90, effort: 6 })
		.toFile(outPath);
	console.log(`  wrote ${ATLAS}×${ATLAS} → ${outPath}`);
}

main().catch((e) => {
	console.error('fatal:', e);
	process.exit(1);
});
