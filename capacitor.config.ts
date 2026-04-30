import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 8 mobile shell config (PRQ-16 M3c3).
 *
 * `appId` + `appName` are locked per spec §1. webDir resolves to the
 * Vite `dist/` produced by `pnpm build:native` (which builds with
 * `base: '/'` instead of the GitHub Pages base path).
 *
 * Plugin config:
 *   - CapacitorSQLite — drizzle native adapter target. Encryption
 *     off for alpha; M5 RC2 wires the per-device pass via
 *     @capacitor/secure-storage-plugin.
 *   - SplashScreen — the source `resources/splash.png` is generated
 *     by `pnpm dlx @capacitor/assets generate` once a designer ships
 *     the 2732² source image. Until then, system default.
 *   - StatusBar — dark icons on the light Landing page; Game flips
 *     to light icons via the runtime hook in app/shell/lifecycle.ts.
 */
const config: CapacitorConfig = {
	appId: 'cabinet.arcade.dord',
	appName: 'DORD',
	webDir: 'dist',
	server: {
		androidScheme: 'https',
	},
	android: {
		// Lock portrait per spec §5; landscape comes back via M5
		// PRQ-B9 mobile UX pass if user research wants it.
		allowMixedContent: false,
	},
	ios: {
		// Light status bar by default; Game route flips to dark.
		contentInset: 'automatic',
	},
	plugins: {
		CapacitorSQLite: {
			iosDatabaseLocation: 'Library/CapacitorDatabase',
			iosIsEncryption: false,
			androidIsEncryption: false,
		},
		SplashScreen: {
			launchShowDuration: 1200,
			backgroundColor: '#15181c',
			showSpinner: false,
			androidScaleType: 'CENTER_CROP',
			splashFullScreen: true,
		},
		StatusBar: {
			style: 'DEFAULT',
			backgroundColor: '#15181c',
			overlaysWebView: false,
		},
	},
};

export default config;
