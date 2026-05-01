import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 8 mobile shell config.
 *
 * `appId` + `appName` are locked. webDir resolves to the Vite `dist/`
 * produced by `pnpm build:native` (which sets `CAPACITOR=true` so vite
 * builds with `base: '/'` and disables sourcemaps for the bundled shell).
 *
 * Persistence is `@capacitor/preferences` only (no SQLite, no drizzle).
 * Native shells (`android/`, `ios/`) are NOT committed — they are
 * generated on demand by `pnpm cap add android` / `pnpm cap add ios`.
 * `pnpm cap:sync` will fail until that one-time scaffold runs.
 *
 * Per spec §5: portrait-locked on Android. iOS uses automatic content
 * inset for the safe area.
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
