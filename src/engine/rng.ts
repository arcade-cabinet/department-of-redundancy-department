// Engine RNG facade. Per ts-browser-game profile, `Math.random()` is forbidden
// outside this module. Every other module imports `rand()` from here.
//
// v1: Math.random() passthrough. Swappable to a seeded PRNG (e.g. seedrandom)
// when deterministic test replay lands without touching call sites.

export function rand(): number {
	return Math.random();
}
