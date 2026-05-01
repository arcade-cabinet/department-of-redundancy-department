import { describe, expect, it } from 'vitest';
import type { CueAction } from './cues';
import { drainPendingCues, isHandlesDependent } from './pendingCueQueue';

// Pinning the verb classification — runtime + tests share the predicate
// so adding a new handle-reading verb requires updating this table.
type VerbCase = [verb: CueAction['verb'], expected: boolean];

const cases: readonly VerbCase[] = [
	// Handle-dependent — readers of levelHandles. Queued when handles null.
	['door', true],
	['shutter', true],
	['lighting', true],
	['level-event', true],
	['prop-anim', true],
	// Independent — run immediately regardless of handles state.
	['transition', false],
	['civilian-spawn', false],
	['audio-stinger', false],
	['ambience-fade', false],
	['narrator', false],
	['camera-shake', false],
	['enemy-spawn', false],
	['boss-spawn', false],
	['boss-phase', false],
];

describe('isHandlesDependent', () => {
	it.each(cases)('%s → %s', (verb, expected) => {
		// Minimal CueAction shape — only the verb is read by the predicate.
		const action = { verb } as unknown as CueAction;
		expect(isHandlesDependent(action)).toBe(expected);
	});
});

describe('drainPendingCues', () => {
	it('returns queued items in insertion order', () => {
		const q = [1, 2, 3, 4];
		expect(drainPendingCues(q)).toEqual([1, 2, 3, 4]);
	});

	it('empties the input array atomically', () => {
		const q = ['a', 'b', 'c'];
		drainPendingCues(q);
		expect(q.length).toBe(0);
	});

	it('returns an empty array on an empty queue', () => {
		const q: number[] = [];
		expect(drainPendingCues(q)).toEqual([]);
	});

	it('snapshot semantics — re-entrant pushes after drain stay queued', () => {
		// Mirrors the runtime: a handler dispatched during drain might
		// push a follow-up cue. That follow-up MUST land in the queue,
		// not be processed in the same drain pass.
		const q: number[] = [10, 20];
		const drained = drainPendingCues(q);
		// Simulate a re-entrant push by a handler running mid-drain:
		q.push(99);
		expect(drained).toEqual([10, 20]);
		expect(q).toEqual([99]);
	});
});
