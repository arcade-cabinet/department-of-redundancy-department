import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 8 mobile shell config.
 *
 * `appId` + `appName` are locked. webDir resolves to the Vite `dist/`
 * produced by `pnpm build:native` (which sets `CAPACITOR=true` so vite
 * builds with `base: '/'` and disables sourcemaps for the bundled shell).
 *
 * Persistence is `@capacitor/preferences` only (no SQLite, no drizzle).
 * Native shells (`android/`, `ios/`) are committed (PRQ B.1); build
 * artifacts under them are gitignored.
 *
 * Per spec §5: portrait-locked on both platforms. Android lock is via
 * `android:screenOrientation="portrait"` on MainActivity in
 * `android/app/src/main/AndroidManifest.xml`. iOS lock is via
 * `UISupportedInterfaceOrientations` in `ios/App/App/Info.plist`
 * (portrait-only on iPhone; portrait + upside-down on iPad). iOS uses
 * automatic content inset for the safe area.
 */
const config: CapacitorConfig = {
	appId: 'cabinet.arcade.dord',
	appName: 'DORD',
	webDir: 'dist',
	server: {
		androidScheme: 'https',
	},
	android: {
		allowMixedContent: false,
	},
	ios: {
		contentInset: 'automatic',
	},
};

export default config;
