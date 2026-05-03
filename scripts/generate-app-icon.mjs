#!/usr/bin/env node
/**
 * Procedural DORD app-icon + splash generator.
 *
 * Produces deterministic source PNGs in resources/ that are then fed to
 * @capacitor/assets to derive every platform variant (Android adaptive
 * icon foreground/background, iOS App Store + universal sizes, splash
 * screens light/dark).
 *
 * Brand:
 * - Background: dark navy gradient (#0B1428 → #1B2438) — matches the
 *   cabinet plays-in-the-dark aesthetic.
 * - Mark: stacked "DOR/D" gold logo (#FFD55A — same as the high-score
 *   "1ST" gold + the justice-shot reticle) on a vignette-lit ground.
 * - Border: 56px gold ring (icon only) for arcade-cabinet feel.
 *
 * The mark uses raw rectangle compositing — no font dependency — so the
 * generator runs identically on any Node 22 install.
 */

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, 'resources');

const GOLD = '#FFD55A';
const NAVY_DARK = '#0B1428';
const NAVY_LIGHT = '#1B2438';

await mkdir(out, { recursive: true });

/**
 * Build a square SVG that we hand to sharp. SVG keeps the math vector
 * so the same definition scales cleanly to 1024 (icon) and 2732 (splash).
 *
 * Layout (in 1024-grid units; everything else is a transform):
 * - Outer 1024x1024 dark-navy rounded-rect "cabinet bezel"
 * - Inner 912x912 rounded-rect bevel showing brand-gold edge
 * - Centered "DORD" mark — 4 stacked rectangle glyphs on a 2x2 grid:
 *     D O
 *     R D
 *   each glyph is a stylized rectangle frame with a single notch cut.
 */
function brandSvg({ size, includeBorder, splash }) {
	const s = size;
	const center = s / 2;

	// In splash mode the mark is smaller (50% of canvas) so the dark
	// surround dominates and matches an "app loading" feel.
	const markScale = splash ? 0.5 : 0.78;
	const markSize = s * markScale;
	const markX = center - markSize / 2;
	const markY = center - markSize / 2;

	const cell = markSize / 2;
	const inset = cell * 0.08;
	const stroke = cell * 0.14;

	// Path for one "block" letterform — 4 corners, drawn as a rectangle
	// frame with a square notch carved out of one corner. Each glyph
	// rotates the notch to a different corner so the four cells read as
	// "D O R D" without needing a font.
	function glyph(cx, cy, notch /* 0=TL,1=TR,2=BL,3=BR */) {
		const x = cx - cell / 2 + inset;
		const y = cy - cell / 2 + inset;
		const w = cell - inset * 2;
		const h = cell - inset * 2;
		const ix = x + stroke;
		const iy = y + stroke;
		const iw = w - stroke * 2;
		const ih = h - stroke * 2;
		const notchW = stroke * 1.6;
		const notchH = stroke * 1.6;

		const notchCoords = [
			[ix, iy], // TL
			[ix + iw - notchW, iy], // TR
			[ix, iy + ih - notchH], // BL
			[ix + iw - notchW, iy + ih - notchH], // BR
		];
		const [nx, ny] = notchCoords[notch];

		return `
			<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFD55A" rx="${stroke * 0.3}"/>
			<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#0B1428"/>
			<rect x="${nx}" y="${ny}" width="${notchW}" height="${notchH}" fill="#FFD55A"/>
		`;
	}

	const border = includeBorder
		? `<rect x="${s * 0.044}" y="${s * 0.044}" width="${s * 0.912}" height="${s * 0.912}" fill="none" stroke="#FFD55A" stroke-width="${s * 0.018}" rx="${s * 0.16}"/>`
		: '';

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
	<defs>
		<radialGradient id="bgGrad" cx="50%" cy="42%" r="70%">
			<stop offset="0%" stop-color="#1B2438"/>
			<stop offset="60%" stop-color="#0F1A2E"/>
			<stop offset="100%" stop-color="#070C18"/>
		</radialGradient>
		<radialGradient id="vignette" cx="50%" cy="100%" r="80%">
			<stop offset="0%" stop-color="#FFD55A" stop-opacity="0.08"/>
			<stop offset="100%" stop-color="#FFD55A" stop-opacity="0"/>
		</radialGradient>
	</defs>
	<rect width="${s}" height="${s}" fill="url(#bgGrad)"/>
	<rect width="${s}" height="${s}" fill="url(#vignette)"/>
	${border}
	<g transform="translate(${markX}, ${markY})">
		${glyph(cell * 0.5, cell * 0.5, 1)}
		${glyph(cell * 1.5, cell * 0.5, 2)}
		${glyph(cell * 0.5, cell * 1.5, 0)}
		${glyph(cell * 1.5, cell * 1.5, 3)}
	</g>
</svg>`;
}

async function writePng(filename, size, opts) {
	const svg = brandSvg({ size, ...opts });
	const path = resolve(out, filename);
	await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path);
	process.stdout.write(`✓ ${filename} (${size}×${size})\n`);
}

// 1024² icon — Apple App Store + Google Play both consume this size.
// @capacitor/assets derives every smaller platform variant from it.
await writePng('icon-only.png', 1024, { includeBorder: true, splash: false });
await writePng('icon-foreground.png', 1024, { includeBorder: false, splash: false });

// Adaptive icon background (Android) — solid navy is the safest choice
// since adaptive icons get cropped and animated by the launcher.
{
	const path = resolve(out, 'icon-background.png');
	await sharp({
		create: {
			width: 1024,
			height: 1024,
			channels: 4,
			background: NAVY_DARK,
		},
	})
		.png({ compressionLevel: 9 })
		.toFile(path);
	process.stdout.write(`✓ icon-background.png (1024×1024)\n`);
}

// 2732² splash — universal source for both light and dark splash variants.
// @capacitor/assets handles the variant matrix (iPad portrait + landscape,
// Android default + dark, splash-screen plugin asset).
await writePng('splash.png', 2732, { includeBorder: false, splash: true });
await writePng('splash-dark.png', 2732, { includeBorder: false, splash: true });

process.stdout.write(`\nWrote source PNGs to ${out}\n`);
process.stdout.write(`Run \`pnpm cap:resources\` to derive platform variants.\n`);

// Suppress unused-binding lint for the imported color constants (they
// document the brand palette even when sharp's solid-fill path is the
// only consumer).
void NAVY_LIGHT;
void GOLD;
