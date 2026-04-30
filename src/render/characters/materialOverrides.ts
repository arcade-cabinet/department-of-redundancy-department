import type { Material, MeshStandardMaterial } from 'three';

/**
 * Inject hit-flash + dissolve uniforms into a `MeshStandardMaterial`.
 *
 * - `uHitFlash` (0..1): mixes the surface color toward `--auditor-red`
 *   (#E53D3D) for the duration of a hit reaction. Driven by
 *   `hitFlash(elapsedMs)` from locomotion.ts.
 * - `uDissolve` (0..1): noise-thresholded fragment discard so the
 *   character fades out as a death effect. Driven by
 *   `deathDissolve(elapsedMs)`.
 *
 * Why patch onBeforeCompile instead of writing a custom shader: lets us
 * keep three's MeshStandardMaterial light/shadow path intact (PBR,
 * shadow casting, etc.) and only weave in our two effects. drei's
 * `useGLTF` hands us standard materials; this stays compatible.
 *
 * Usage: call `applyOverrides(mat)` once per cloned material; read
 * back `controls.flash` / `controls.dissolve` to mutate per-frame in
 * useFrame. The patch is idempotent — second call returns the same
 * controls without re-patching.
 */

export interface MaterialOverrideControls {
	/** Mutate per-frame: 0 = unflashed; 1 = full red. */
	flash: { value: number };
	/** Mutate per-frame: 0 = visible; 1 = fully dissolved (every fragment discarded). */
	dissolve: { value: number };
}

const PATCH_KEY = '__dordOverrides';
const FLASH_COLOR = '#E53D3D';

interface PatchedMaterial extends MeshStandardMaterial {
	[PATCH_KEY]?: MaterialOverrideControls;
}

export function applyOverrides(mat: Material): MaterialOverrideControls {
	const m = mat as PatchedMaterial;
	const existing = m[PATCH_KEY];
	if (existing) return existing;

	const flash = { value: 0 };
	const dissolve = { value: 0 };

	const prev = m.onBeforeCompile?.bind(m);
	m.onBeforeCompile = (shader, renderer) => {
		prev?.(shader, renderer);
		shader.uniforms.uHitFlash = flash;
		shader.uniforms.uDissolve = dissolve;
		shader.uniforms.uFlashColor = { value: hexToRgb(FLASH_COLOR) };

		// Inject after the standard fragment chunk so we modify the final
		// `gl_FragColor` write. three's chunk template guarantees a
		// `vec4 diffuseColor` and `outgoingLight` are in scope.
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <common>',
			[
				'#include <common>',
				'uniform float uHitFlash;',
				'uniform float uDissolve;',
				'uniform vec3 uFlashColor;',
				// Cheap value-noise so the dissolve looks ragged not banded.
				'float dordHash(vec2 p) {',
				'  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);',
				'}',
			].join('\n'),
		);

		// Discard fragments above the dissolve threshold; mix flash color
		// in just before the tone mapping.
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <dithering_fragment>',
			[
				'if (uDissolve > 0.0) {',
				'  float n = dordHash(gl_FragCoord.xy * 0.05);',
				'  if (n < uDissolve) discard;',
				'}',
				'gl_FragColor.rgb = mix(gl_FragColor.rgb, uFlashColor, clamp(uHitFlash, 0.0, 1.0));',
				'#include <dithering_fragment>',
			].join('\n'),
		);
	};

	// Force re-compile next frame even if the material was previously
	// drawn — three's program cache keys on the material's `version`
	// + the shader source identity.
	m.needsUpdate = true;

	const controls: MaterialOverrideControls = { flash, dissolve };
	m[PATCH_KEY] = controls;
	return controls;
}

function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	const r = Number.parseInt(h.slice(0, 2), 16) / 255;
	const g = Number.parseInt(h.slice(2, 4), 16) / 255;
	const b = Number.parseInt(h.slice(4, 6), 16) / 255;
	return [r, g, b];
}
