/**
 * Capacitor native plugin boot — status bar, splash screen, haptics.
 *
 * All three plugins are no-ops on web (the Capacitor stubs return
 * resolved promises without throwing) so this same module runs in
 * dev/Playwright and in the packaged Android / iOS shells.
 *
 * Splash hide-on-ready: spec §5 says the splash should hide once the
 * first level's geometry is in. The `hideSplashWhenReady` helper is
 * called from the level-build pipeline after `levelHandlesReady` flips
 * true so the player never sees a black canvas.
 */

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';

/**
 * Configure the status bar at boot.
 *
 * Dark style = light text on dark background. Matches the brand
 * navy + gold palette and the rest of the gameplay UI which runs on
 * a dark canvas. `setOverlaysWebView(false)` keeps the status bar
 * out of the canvas pick-coordinate space — without it iOS notch
 * geometry would intercept the player's first crosshair shots.
 *
 * Safe to call on web — the plugin stubs no-op.
 */
export async function configureStatusBar(): Promise<void> {
	try {
		await StatusBar.setStyle({ style: StatusBarStyle.Dark });
		await StatusBar.setOverlaysWebView({ overlay: false });
	} catch {
		// Web stub or unsupported platform — fail silent. The browser
		// has no status bar and there's nothing to configure.
	}
}

/**
 * Hide the native splash. Called once the renderer is showing the
 * first frame of actual gameplay (insert-coin overlay rendered on
 * the boot scene).
 */
export async function hideSplash(): Promise<void> {
	try {
		await SplashScreen.hide({ fadeOutDuration: 200 });
	} catch {
		// Web — no splash plugin attached.
	}
}

/**
 * Tactile feedback on every successful trigger pull. ImpactStyle.Light
 * matches arcade-trigger feel — a fast tap, not a heavy thunk. Heavy
 * is reserved for "you took damage" / "you died" moments (PRQ B.3
 * scope is just trigger-pull; damage haptics can land in a follow-up).
 *
 * Fire-and-forget: we deliberately don't await. Haptics latency on a
 * busy UI thread is the difference between snappy and mushy trigger
 * feel; awaiting it would serialize the next pickAt + draw.
 */
export function triggerHapticOnFire(): void {
	void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
		// Web stub or unsupported — silent.
	});
}
