// Engine clock facade. Per ts-browser-game profile, gameplay-path code that
// reads wall-clock time goes through here so deterministic replay can swap
// in a frame-driven clock without touching call sites.
//
// Test mode is opt-in via the `?frame=N` query param. When set, time is
// driven entirely by `advanceFrames(n)` exposed on `window.__game` — every
// `now()` returns the accumulated virtual ms. This lets tests pin exact
// frame counts and assert deterministic outcomes without flake from
// `performance.now()` jitter.
//
// `?seed=N` activates without `?frame=N` (RNG only), but here we only care
// about the frame-driven flag.

const FIXED_FRAME_DT_MS = 1000 / 60;

// Test hooks are stripped from production via Vite's `import.meta.env.PROD`
// constant — any attempt to set `?frame=N` on a production URL is ignored,
// preventing the determinism-bypass surface flagged by the security audit.
// `import.meta.env` is always defined under Vite (dev, build, and node tests
// via vitest); the optional-chain belt + suspenders covers exotic loaders.
const TEST_HOOKS_ENABLED = !(import.meta?.env?.PROD ?? false);

function readQueryParams(): URLSearchParams {
	if (!TEST_HOOKS_ENABLED) return new URLSearchParams();
	const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
	return new URLSearchParams(search);
}

const params = readQueryParams();
const frameDriven = TEST_HOOKS_ENABLED && params.has('frame');

let virtualMs = 0;

export function now(): number {
	if (frameDriven) return virtualMs;
	return performance.now();
}

/**
 * Test-mode only: advance the virtual clock by `frames` 60 Hz ticks.
 * No-op outside frame-driven mode so production callers cannot accidentally
 * skew time. Exposed on `window.__game` by `installTestHooks` below.
 */
export function advanceFrames(frames: number): void {
	if (!frameDriven) return;
	if (!Number.isFinite(frames) || frames <= 0) return;
	virtualMs += frames * FIXED_FRAME_DT_MS;
}

/** True when `?frame=N` is set on the URL. Read-only. */
export function isFrameDriven(): boolean {
	return frameDriven;
}

/**
 * Wire up `window.__game.advanceFrames(n)` so playwright/visual tests can
 * pin exact frame counts. Called once from main.ts boot. No-op when not
 * in frame-driven mode (avoids leaking the test surface to production).
 */
export function installTestHooks(): void {
	if (!frameDriven) return;
	const win = globalThis as { __game?: { advanceFrames: (n: number) => void } };
	win.__game = { advanceFrames };
	const initial = Number.parseInt(params.get('frame') ?? '0', 10);
	if (Number.isFinite(initial) && initial > 0) {
		advanceFrames(initial);
	}
}
