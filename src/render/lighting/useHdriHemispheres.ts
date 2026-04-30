import { suspend } from 'suspend-react';
import { type HemisphereTextures, loadHdriHemispheres } from './hdriProjection';

/**
 * Suspense-compatible hook returning the projected ceiling/floor textures
 * derived from the HDRI. Resolves once at app boot; subsequent calls hit
 * `suspend-react`'s in-memory cache.
 */
export function useHdriHemispheres(path: string): HemisphereTextures {
	return suspend(() => loadHdriHemispheres(path), ['hdri-hemispheres', path]);
}
