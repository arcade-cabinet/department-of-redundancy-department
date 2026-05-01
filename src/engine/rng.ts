// Engine RNG facade. Per ts-browser-game profile, `Math.random()` outside
// this module is a finding. Every gameplay-path module imports `rand()`
// from here.
//
// `?seed=N` URL param activates a seedrandom-backed PRNG so visual /
// behavior tests can pin sequences. Default (no param, or in production
// where the test hook is stripped) falls through to `Math.random()` so
// production runs stay non-deterministic and unguessable.
//
// The seed-handling surface mirrors `clock.ts`: `import.meta.env.PROD`
// strips the URL-param read in production builds, so a `?seed=` param
// cannot bend the prod RNG to a known sequence.

import seedrandom from 'seedrandom';

const TEST_HOOKS_ENABLED = !(import.meta?.env?.PROD ?? false);

function readQueryParams(): URLSearchParams {
	if (!TEST_HOOKS_ENABLED) return new URLSearchParams();
	const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
	return new URLSearchParams(search);
}

const params = readQueryParams();
const seedParam = TEST_HOOKS_ENABLED ? params.get('seed') : null;

const seededPrng: (() => number) | null = seedParam !== null ? seedrandom(seedParam) : null;

export function rand(): number {
	if (seededPrng) return seededPrng();
	return Math.random();
}

/** True when a `?seed=N` URL param is driving the RNG. Read-only. */
export function isSeeded(): boolean {
	return seededPrng !== null;
}
