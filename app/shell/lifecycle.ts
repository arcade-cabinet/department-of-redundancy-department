/**
 * App lifecycle hooks for the Capacitor shell (PRQ-16 T5, M3c3).
 *
 * On Android + iOS, the OS pauses the WebView when the app is
 * backgrounded. We mirror that into the game's pause state so the
 * Physics tick + audio also halt — and flush the persistence save
 * loop synchronously so a force-quit doesn't drop the last second
 * of progress.
 *
 * Native back-button (Android only):
 *   - Game → open PauseMenu (don't exit)
 *   - PauseMenu → close it
 *   - Landing → confirm-exit Dialog (M5 polish; alpha just calls
 *     `App.exitApp()` directly)
 *
 * Implementation defers `@capacitor/app` import to runtime so the web
 * build doesn't need the dep. Web returns a no-op disposer.
 */

export interface LifecycleHandlers {
	onPause: () => void;
	onResume: () => void;
	onBack: () => boolean; // return true to suppress default OS handling
}

/** Subscribes to Capacitor app-state events. Returns a dispose fn.
 *  No-op (returns immediate dispose) when running in a browser
 *  context where @capacitor/app isn't installed. */
export async function subscribeMobileLifecycle(handlers: LifecycleHandlers): Promise<() => void> {
	const isCap = typeof window !== 'undefined' && (window as { Capacitor?: unknown }).Capacitor;
	if (!isCap) return () => {};
	try {
		// Dynamic import via string indirection so Vite/Rolldown's bundler
		// doesn't try to resolve the optional `@capacitor/app` dep at
		// build time. The native build path provides it; web doesn't.
		const dep = '@capacitor/app';
		const mod = await (Function('m', 'return import(m)') as (m: string) => Promise<unknown>)(dep)
			.then((m) => m as { App?: CapacitorApp })
			.catch(() => null);
		if (!mod?.App) return () => {};
		const App = mod.App;
		const stateHandle = await App.addListener('appStateChange', (state) => {
			if (state.isActive) handlers.onResume();
			else handlers.onPause();
		});
		const backHandle = await App.addListener('backButton', () => {
			const handled = handlers.onBack();
			if (!handled) App.exitApp();
		});
		return () => {
			void stateHandle.remove();
			void backHandle.remove();
		};
	} catch {
		return () => {};
	}
}

/** Minimal slice of the Capacitor App plugin — typed locally so the
 *  module compiles without the `@capacitor/app` dep. */
interface CapacitorApp {
	addListener(
		event: 'appStateChange',
		cb: (state: { isActive: boolean }) => void,
	): Promise<{ remove(): Promise<void> }>;
	addListener(event: 'backButton', cb: () => void): Promise<{ remove(): Promise<void> }>;
	exitApp(): void;
}
