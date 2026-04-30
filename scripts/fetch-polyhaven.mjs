#!/usr/bin/env node
/**
 * Fetch one indoor warehouse / office HDRI plus 5 textures (carpet, ceiling
 * tile, laminate, drywall, whiteboard) from polyhaven.com.
 *
 * Idempotent: skips files that already exist on disk.
 *
 * API docs: https://api.polyhaven.com/
 *  - GET /assets?type=hdris       — list HDRIs
 *  - GET /files/<slug>            — { hdri: { 2k: { hdr: { url, ... } } } }
 *  - GET /files/<slug>            — for textures returns Diffuse / Rough / nor_gl
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hdriDir = join(repoRoot, 'public', 'assets', 'hdri');
const texDir = join(repoRoot, 'public', 'assets', 'textures');
mkdirSync(hdriDir, { recursive: true });
mkdirSync(texDir, { recursive: true });

// Real PolyHaven slug — verified to exist in the catalog at script-write time.
// `unfinished_office` is the most office-like indoor HDRI; `empty_warehouse_01`
// is the spec's stated fallback. Override via DORD_HDRI_SLUG env var if needed.
const HDRI_SLUG = process.env.DORD_HDRI_SLUG ?? 'unfinished_office';
const HDRI_RES = process.env.DORD_HDRI_RES ?? '2k';

// Verified PolyHaven slugs covering the texture roles in spec §6.
const TEX_SLUG_MAP = {
	carpet: 'dirty_carpet',
	'ceiling-tile': 'ceiling_interior',
	laminate: 'laminate_floor_02',
	drywall: 'grey_plaster',
	whiteboard: 'concrete_panels',
};

const POLY_BASE = 'https://api.polyhaven.com';

async function fetchJson(url) {
	const r = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!r.ok) throw new Error(`${r.status} ${url}`);
	return r.json();
}

async function fetchBinary(url, dest) {
	if (existsSync(dest) && statSync(dest).size > 0) {
		return { skipped: true };
	}
	const r = await fetch(url);
	if (!r.ok) throw new Error(`${r.status} ${url}`);
	const buf = Buffer.from(await r.arrayBuffer());
	mkdirSync(dirname(dest), { recursive: true });
	writeFileSync(dest, buf);
	return { skipped: false, bytes: buf.length };
}

async function fetchHdri() {
	console.log(`HDRI: ${HDRI_SLUG} @ ${HDRI_RES}`);
	const files = await fetchJson(`${POLY_BASE}/files/${HDRI_SLUG}`).catch((e) => {
		console.error(`  HDRI files lookup failed: ${e.message}`);
		return null;
	});
	const variant = files?.hdri?.[HDRI_RES]?.hdr;
	if (!variant?.url) {
		console.error(`  ${HDRI_SLUG} ${HDRI_RES} hdr URL missing`);
		return;
	}
	const dest = join(hdriDir, `${HDRI_SLUG}_${HDRI_RES}.hdr`);
	try {
		const r = await fetchBinary(variant.url, dest);
		console.log(
			`  ${HDRI_SLUG}_${HDRI_RES}.hdr ${r.skipped ? 'skipped' : `${(r.bytes / 1024 / 1024).toFixed(2)} MB`}`,
		);
	} catch (e) {
		console.error(`  HDRI download failed: ${e.message}`);
	}
}

// Pull only the maps we actually use in the renderer. Diffuse + nor_gl
// (OpenGL-convention normal) + Rough + AO covers everything our PBR materials
// need; nor_dx, ARM, Bump, Displacement, Spec, blend, gltf, mtlx all get skipped.
const TEXTURE_MAPS_KEEP = new Set(['Diffuse', 'nor_gl', 'Rough', 'AO']);

async function fetchOneMap(localName, mapKey, mapData) {
	// `typeof null === 'object'` so the null check matters — PolyHaven
	// occasionally returns null for some map slots on certain assets.
	if (!mapData || typeof mapData !== 'object' || !mapData['2k']) return false;
	const variants = mapData['2k'];
	const ext = variants.jpg ? 'jpg' : variants.png ? 'png' : variants.exr ? 'exr' : null;
	if (!ext) return false;
	const dest = join(texDir, localName, `${localName}_${mapKey}_2k.${ext}`);
	try {
		const r = await fetchBinary(variants[ext].url, dest);
		if (!r.skipped)
			console.log(`  ${localName}/${mapKey} ${(r.bytes / 1024 / 1024).toFixed(2)} MB`);
		return true;
	} catch (e) {
		console.error(`  ${localName}/${mapKey} fail: ${e.message}`);
		return false;
	}
}

async function fetchTexture(localName, slug) {
	const files = await fetchJson(`${POLY_BASE}/files/${slug}`).catch((e) => {
		console.error(`  ${localName} (${slug}) lookup failed: ${e.message}`);
		return null;
	});
	if (!files) return;
	let any = false;
	for (const [mapKey, mapData] of Object.entries(files)) {
		if (!TEXTURE_MAPS_KEEP.has(mapKey)) continue;
		if (await fetchOneMap(localName, mapKey, mapData)) any = true;
	}
	if (!any) console.log(`  ${localName}: no maps fetched (already on disk?)`);
}

async function main() {
	await fetchHdri();
	for (const [name, slug] of Object.entries(TEX_SLUG_MAP)) {
		console.log(`Texture: ${name} (PolyHaven=${slug})`);
		await fetchTexture(name, slug);
	}
}

main().catch((e) => {
	console.error('fatal:', e);
	process.exit(1);
});
