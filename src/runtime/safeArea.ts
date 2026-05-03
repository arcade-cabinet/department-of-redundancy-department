/**
 * iOS notch + home-indicator safe-area inset reader.
 *
 * Babylon GUI is rendered on the WebGL canvas, so plain CSS
 * `padding: env(safe-area-inset-top)` can't reach the in-game overlays
 * (HUD, reticle, score). This module reads the actual pixel values via
 * a hidden DOM probe with the env() vars applied as paddings, then
 * exposes them as numbers the GUI layout code can add to its
 * hardcoded `top`/`bottom`/`left`/`right` offsets.
 *
 * Web (no notch) / Android: all four insets resolve to 0, so the
 * existing layout is unchanged. iOS-portrait: top inset is the notch
 * height (~44px on iPhone 14 Pro), bottom is the home-indicator
 * (~34px). The caller adds these to its existing offset and the
 * layout shifts down on iPhone but not on web.
 *
 * Read once at boot — insets only change on orientation change, but
 * the game is portrait-locked (PRQ B.1), so no re-read is needed.
 */

export interface SafeAreaInsets {
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
}

const ZERO: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

let cached: SafeAreaInsets | null = null;

/**
 * Returns the current safe-area inset in CSS pixels, computed by
 * resolving `env(safe-area-inset-*)` against a hidden probe element.
 * Cached after first call. Called from the HUD overlay constructor.
 */
export function getSafeAreaInsets(): SafeAreaInsets {
	if (cached) return cached;
	if (typeof document === 'undefined') return ZERO;

	const probe = document.createElement('div');
	probe.style.cssText = [
		'position: fixed',
		'top: 0',
		'left: 0',
		'width: 0',
		'height: 0',
		'visibility: hidden',
		'pointer-events: none',
		'padding-top: env(safe-area-inset-top, 0px)',
		'padding-right: env(safe-area-inset-right, 0px)',
		'padding-bottom: env(safe-area-inset-bottom, 0px)',
		'padding-left: env(safe-area-inset-left, 0px)',
	].join(';');
	document.body.appendChild(probe);
	const cs = window.getComputedStyle(probe);
	const insets: SafeAreaInsets = {
		top: parseFloat(cs.paddingTop) || 0,
		right: parseFloat(cs.paddingRight) || 0,
		bottom: parseFloat(cs.paddingBottom) || 0,
		left: parseFloat(cs.paddingLeft) || 0,
	};
	probe.remove();
	cached = insets;
	return insets;
}

/**
 * Test-only: reset the cache. Useful for unit tests that want to
 * exercise the read path with a freshly-mocked DOM.
 */
export function resetSafeAreaCache(): void {
	cached = null;
}
