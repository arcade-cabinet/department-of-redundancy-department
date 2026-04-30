import seedrandom from 'seedrandom';

/**
 * Seeded PRNG for reproducible gameplay. Same primitive (`seedrandom`)
 * and same API as arcade-cabinet/mean-streets `src/sim/cards/rng.ts` —
 * we share the `Rng` interface verbatim so simulation code can move
 * between repos without rewrites.
 *
 * The org convention (mean-streets + chonkers + Beppo-Laughs) is:
 *
 * - **Never** call `Math.random()` directly outside the one documented
 *   exception below. Every random draw in DORD code goes through an
 *   `Rng` instance.
 * - **Never** keep a mutable global RNG. Each scope (per-floor maze,
 *   per-spawn-director call, etc.) gets its own `Rng` keyed on a
 *   deterministic seed.
 * - Entropy enters at *one* boundary point. For DORD that boundary is
 *   `freshSeed()`, called once at new-game creation. The seed is
 *   persisted (spec §8 `world_meta.seed`); every subsequent run
 *   replays from it.
 *
 * **Yuka exception:** `yuka` (the AI library) calls `Math.random()`
 * internally for steering jitter, FSM stochasticity, and goal
 * arbitration tie-breaks. That is allowed and intentional. Gameplay
 * determinism for DORD is enforced at the *placement* boundary —
 * which cubicles spawn what, when threat tiers escalate, what the
 * spawn director picks per chunk-enter — all of which run through our
 * own seeded `Rng`. Once spawned, individual AI tick decisions don't
 * need replay-determinism because the player's interactions are the
 * primary input, not the per-frame steering noise.
 *
 * Two RNG tracks:
 *
 * 1. **Gameplay** — derived from the world seed (or per-floor seed,
 *    per-spawn seed, etc.). Always deterministic. Used by maze
 *    generation, spawn director, AI decisions, drop tables, named
 *    cubicle labels, anything the player would notice if it changed
 *    between replays of the same seed.
 *
 * 2. **Cosmetic** — derived from a per-session seed taken from
 *    `crypto.getRandomValues()` at boot. Same `Rng` interface; just
 *    different starting entropy. Used for things the player can't
 *    distinguish across replays: particle jitter, UI sparkle timing,
 *    light flicker patterns, hop-walk phase offset.
 *
 * Cosmetic uses a separate Rng so it never perturbs gameplay state
 * (e.g. consuming a random for a particle wouldn't shift the next
 * gameplay draw).
 */

export interface Rng {
	/** Returns [0, 1) like Math.random(). */
	next(): number;
	/** Returns integer in [min, max] inclusive. */
	int(min: number, max: number): number;
	/** Pick a random element from a non-empty array. Throws if empty. */
	pick<T>(arr: readonly T[]): T;
	/** Fisher-Yates shuffle in place. */
	shuffle<T>(arr: T[]): T[];
	/** The original seed string (for logging / replay). */
	readonly seed: string;
}

/** Create a fresh `Rng` keyed on `seed`. */
export function createRng(seed: string): Rng {
	const generator = seedrandom(seed);

	function next(): number {
		return generator.quick();
	}

	return {
		next,
		int(min: number, max: number): number {
			return min + Math.floor(next() * (max - min + 1));
		},
		pick<T>(arr: readonly T[]): T {
			if (arr.length === 0) throw new Error('rng.pick: cannot pick from empty array');
			// biome-ignore lint/style/noNonNullAssertion: index in bounds by guard
			return arr[Math.floor(next() * arr.length)]!;
		},
		shuffle<T>(arr: T[]): T[] {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(next() * (i + 1));
				// biome-ignore lint/style/noNonNullAssertion: i, j in bounds
				[arr[i], arr[j]] = [arr[j]!, arr[i]!];
			}
			return arr;
		},
		seed,
	};
}

/**
 * One entropy boundary. Called once at new-game creation; the resulting
 * seed is persisted so subsequent runs replay deterministically.
 */
export function freshSeed(): string {
	const buf = new Uint8Array(8);
	globalThis.crypto.getRandomValues(buf);
	let s = '';
	for (const byte of buf) s += byte.toString(16).padStart(2, '0');
	return s;
}

// ---------------------------------------------------------------------------
// Cosmetic Rng singleton — booted once per session from crypto entropy.
// ---------------------------------------------------------------------------

let _cosmetic: Rng | null = null;
export function cosmeticRng(): Rng {
	if (!_cosmetic) _cosmetic = createRng(freshSeed());
	return _cosmetic;
}

// ---------------------------------------------------------------------------
// Adjective-Adjective-Noun seed phrase (cribbed from references/poc.html).
// ---------------------------------------------------------------------------

const ADJ1 = [
	'Synergistic',
	'Redundant',
	'Drab',
	'Mandatory',
	'Suboptimal',
	'Bleak',
	'Circular',
	'Stagnant',
	'Corporate',
	'Lateral',
];
const ADJ2 = [
	'Pointless',
	'Bureaucratic',
	'Administrative',
	'Soul-Crushing',
	'Mediocre',
	'Triplicate',
	'Compliant',
	'Standardized',
];
const NOUNS = [
	'Directive',
	'Memo',
	'Paradigm',
	'Protocol',
	'Committee',
	'Filing',
	'Cubicle',
	'Bottleneck',
	'Oversight',
	'Framework',
];

/**
 * Three-word seed phrase — the player's persistent department designation.
 * Caller MUST pass an `Rng`. There is no `Math.random` fallback by design.
 */
export function generateSeedPhrase(rng: Rng): string {
	return `${rng.pick(ADJ1)} ${rng.pick(ADJ2)} ${rng.pick(NOUNS)}`;
}

/** Two-word label for a per-cubicle nameplate (Adjective + Noun). */
export function pickCubicleLabel(rng: Rng): string {
	return `${rng.pick(ADJ1)} ${rng.pick(NOUNS)}`;
}
