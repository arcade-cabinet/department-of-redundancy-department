import { RepeatWrapping, RGBAFormat, SRGBColorSpace, Texture } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

type HDRTextureData = { width: number; height: number; data: Float32Array };
type HDRTexture = { image: HDRTextureData };

/**
 * Sample an HDRI into two tone-mapped LDR textures: one for the upper
 * hemisphere (used as the ceiling's emissive map) and one for the lower
 * hemisphere (mixed into the floor's emissive). Latitude-longitude
 * (equirect) layout is assumed.
 *
 * Why this exists: when the player is inside an enclosed cubicle maze,
 * the skybox itself is never visible, so a drei <Environment/> burns
 * cubemap memory for ambient PBR light only. We get a more *immersive*
 * result by projecting the HDR luminance directly onto the ceiling and
 * floor planes — the HDR pixels become the lighting, not a math model.
 *
 * Reinhard tone-mapping squashes the HDR range to [0,1]; the result is
 * stored as a normal `Texture` (RGBA8) so it composes with the existing
 * carpet/ceiling-tile albedo textures via emissiveMap on a
 * MeshStandardMaterial.
 */

export type HemisphereTextures = {
	ceiling: Texture;
	floor: Texture;
};

let cached: Promise<HemisphereTextures> | null = null;

export function loadHdriHemispheres(path: string): Promise<HemisphereTextures> {
	if (cached) return cached;
	cached = new Promise((resolve, reject) => {
		new HDRLoader().load(
			path,
			(hdr: unknown) => {
				try {
					resolve(sampleHemispheres(hdr as HDRTexture));
				} catch (err) {
					reject(err instanceof Error ? err : new Error(String(err)));
				}
			},
			undefined,
			(err: unknown) => reject(err instanceof Error ? err : new Error('HDRLoader failed')),
		);
	});
	return cached;
}

function sampleHemispheres(hdr: HDRTexture): HemisphereTextures {
	const w = hdr.image.width;
	const h = hdr.image.height;
	const src = hdr.image.data;

	// Equirect: rows 0..h/2 = upper hemisphere (ceiling), rows h/2..h = lower (floor).
	const halfH = Math.floor(h / 2);
	const ceiling = projectHemisphere(src, w, h, 0, halfH);
	const floor = projectHemisphere(src, w, h, halfH, h);
	return { ceiling, floor };
}

/**
 * Read an equirect HDR slice [rowStart..rowEnd) and produce a square LDR
 * texture suitable for emissiveMap. Average columns within each row to
 * collapse to one row per latitude band, then expand to a square via
 * radial fall-off so the resulting texture tiles cleanly when applied
 * to a planeGeometry.
 *
 * Reinhard tone-map: `c / (1 + c)`. Cheap, preserves relative HDR
 * structure (bright spots stay bright relative to dim corners), and
 * doesn't need an exposure parameter — `MeshStandardMaterial`'s
 * `emissiveIntensity` provides the dial.
 */
function projectHemisphere(
	src: Float32Array,
	w: number,
	_h: number,
	rowStart: number,
	rowEnd: number,
): Texture {
	const SIZE = 64; // 64×64 LDR is plenty for an emissive map at carpet/ceiling scale
	const rows = rowEnd - rowStart;
	const out = new Uint8ClampedArray(SIZE * SIZE * 4);

	for (let dstY = 0; dstY < SIZE; dstY++) {
		// Map dstY (0..SIZE) to a normalized hemisphere band; weight rows
		// near the equator (top of ceiling-band, bottom of floor-band)
		// more heavily so the brightness gradient feels right when looking
		// up/down from inside the maze.
		const v = dstY / SIZE;
		const srcRow = rowStart + Math.floor(v * rows);
		// Average across columns of that row
		let r = 0;
		let g = 0;
		let b = 0;
		const cols = w;
		for (let x = 0; x < cols; x++) {
			const i = (srcRow * w + x) * 4;
			// biome-ignore lint/style/noNonNullAssertion: in-bounds by loop guards
			r += src[i]!;
			// biome-ignore lint/style/noNonNullAssertion: in-bounds by loop guards
			g += src[i + 1]!;
			// biome-ignore lint/style/noNonNullAssertion: in-bounds by loop guards
			b += src[i + 2]!;
		}
		r /= cols;
		g /= cols;
		b /= cols;
		// Reinhard tone-map → 8-bit
		const tr = Math.round((r / (1 + r)) * 255);
		const tg = Math.round((g / (1 + g)) * 255);
		const tb = Math.round((b / (1 + b)) * 255);
		// Repeat across the row (the equirect band is rotationally symmetric
		// after column-averaging; SIZE columns × SIZE rows = a flat-color row,
		// good enough as an emissive contribution)
		for (let dstX = 0; dstX < SIZE; dstX++) {
			const o = (dstY * SIZE + dstX) * 4;
			out[o] = tr;
			out[o + 1] = tg;
			out[o + 2] = tb;
			out[o + 3] = 255;
		}
	}

	const tex = new Texture();
	tex.image = { data: out, width: SIZE, height: SIZE } as unknown as ImageData;
	tex.format = RGBAFormat;
	tex.colorSpace = SRGBColorSpace;
	tex.wrapS = tex.wrapT = RepeatWrapping;
	tex.needsUpdate = true;
	return tex;
}
