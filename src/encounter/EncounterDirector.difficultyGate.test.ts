import { describe, expect, it } from 'vitest';
import type { DifficultyGate } from './cues';
import {
	DIFFICULTY_RANK,
	type Difficulty,
	GATE_MIN_RANK,
	passesDifficultyGate,
} from './EncounterDirector';

/**
 * Unit tests for `passesDifficultyGate` — the pure cue-filter predicate
 * applied at director construction. Pins the matrix described in
 * `docs/spec/03-difficulty-and-modifiers.md` so spec drift is caught
 * without needing a full director instance.
 *
 * Rules pinned:
 *   - Cue without a `difficulty` field passes regardless of run difficulty.
 *   - `easy+`     gate ⇒ all difficulties pass.
 *   - `normal+`   gate ⇒ everything ≥ normal passes.
 *   - `hard+`     gate ⇒ hard, nightmare, un pass.
 *   - `nightmare+` gate ⇒ nightmare, un pass.
 *   - `un-only`   gate ⇒ only un passes.
 */

const ALL_DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'nightmare', 'un'];
const ALL_GATES: readonly DifficultyGate[] = ['easy+', 'normal+', 'hard+', 'nightmare+', 'un-only'];

describe('passesDifficultyGate', () => {
	it('returns true when the cue has no difficulty field (ungated)', () => {
		for (const d of ALL_DIFFICULTIES) {
			expect(passesDifficultyGate(undefined, d)).toBe(true);
		}
	});

	it('easy+ gate admits every difficulty', () => {
		for (const d of ALL_DIFFICULTIES) {
			expect(passesDifficultyGate('easy+', d)).toBe(true);
		}
	});

	it('normal+ gate excludes only easy', () => {
		expect(passesDifficultyGate('normal+', 'easy')).toBe(false);
		expect(passesDifficultyGate('normal+', 'normal')).toBe(true);
		expect(passesDifficultyGate('normal+', 'hard')).toBe(true);
		expect(passesDifficultyGate('normal+', 'nightmare')).toBe(true);
		expect(passesDifficultyGate('normal+', 'un')).toBe(true);
	});

	it('hard+ gate admits hard, nightmare, un only', () => {
		expect(passesDifficultyGate('hard+', 'easy')).toBe(false);
		expect(passesDifficultyGate('hard+', 'normal')).toBe(false);
		expect(passesDifficultyGate('hard+', 'hard')).toBe(true);
		expect(passesDifficultyGate('hard+', 'nightmare')).toBe(true);
		expect(passesDifficultyGate('hard+', 'un')).toBe(true);
	});

	it('nightmare+ gate admits nightmare and un only', () => {
		expect(passesDifficultyGate('nightmare+', 'easy')).toBe(false);
		expect(passesDifficultyGate('nightmare+', 'normal')).toBe(false);
		expect(passesDifficultyGate('nightmare+', 'hard')).toBe(false);
		expect(passesDifficultyGate('nightmare+', 'nightmare')).toBe(true);
		expect(passesDifficultyGate('nightmare+', 'un')).toBe(true);
	});

	it('un-only gate admits only un', () => {
		expect(passesDifficultyGate('un-only', 'easy')).toBe(false);
		expect(passesDifficultyGate('un-only', 'normal')).toBe(false);
		expect(passesDifficultyGate('un-only', 'hard')).toBe(false);
		expect(passesDifficultyGate('un-only', 'nightmare')).toBe(false);
		expect(passesDifficultyGate('un-only', 'un')).toBe(true);
	});

	// Crossproduct sanity check: the predicate's truth table should be
	// monotonic — for any fixed gate, if difficulty `d1` passes and
	// `d2` ranks higher than `d1`, `d2` must also pass. Catches
	// silent re-ordering of DIFFICULTY_RANK or GATE_MIN_RANK.
	it('is monotonic in difficulty for every gate', () => {
		for (const gate of ALL_GATES) {
			let sawPass = false;
			for (const d of ALL_DIFFICULTIES) {
				const allowed = passesDifficultyGate(gate, d);
				if (allowed) sawPass = true;
				if (sawPass) {
					// Once a difficulty passes, every higher-ranked one must too.
					expect(allowed).toBe(true);
				}
			}
		}
	});

	// Spec-canon ranks: a re-ordering of the rank tables would silently
	// shift gate boundaries. Pin the integer ranks so a swap is loud.
	it('exposes spec-canon difficulty ranks', () => {
		expect(DIFFICULTY_RANK).toEqual({
			easy: 0,
			normal: 1,
			hard: 2,
			nightmare: 3,
			un: 4,
		});
	});

	it('exposes spec-canon gate minimum ranks', () => {
		expect(GATE_MIN_RANK).toEqual({
			'easy+': 0,
			'normal+': 1,
			'hard+': 2,
			'nightmare+': 3,
			'un-only': 4,
		});
	});
});
