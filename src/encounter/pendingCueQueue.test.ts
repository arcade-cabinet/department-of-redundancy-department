import { describe, expect, it } from 'vitest';
import type { CueAction } from './cues';
import { HANDLES_DEPENDENT_VERBS, isHandlesDependent } from './pendingCueQueue';

describe('HANDLES_DEPENDENT_VERBS classification', () => {
	it('classifies handle-reading verbs as dependent', () => {
		const dependent: CueAction['verb'][] = [
			'door',
			'shutter',
			'lighting',
			'level-event',
			'prop-anim',
		];
		for (const v of dependent) expect(HANDLES_DEPENDENT_VERBS.has(v)).toBe(true);
	});

	it('classifies pure-runtime verbs as independent (no queueing)', () => {
		const independent: CueAction['verb'][] = [
			'transition',
			'civilian-spawn',
			'audio-stinger',
			'ambience-fade',
			'narrator',
			'camera-shake',
			'enemy-spawn',
			'boss-spawn',
			'boss-phase',
		];
		for (const v of independent) expect(HANDLES_DEPENDENT_VERBS.has(v)).toBe(false);
	});
});

describe('isHandlesDependent', () => {
	it('true for door cues (handles.doors)', () => {
		const action: CueAction = { verb: 'door', doorId: 'd-1', to: 'open' };
		expect(isHandlesDependent(action)).toBe(true);
	});

	it('false for narrator cues (no handles dependency)', () => {
		const action: CueAction = { verb: 'narrator', text: 'hi', durationMs: 1000 };
		expect(isHandlesDependent(action)).toBe(false);
	});

	it('false for transition cues (constructs new level, never queued)', () => {
		const action: CueAction = { verb: 'transition', toLevelId: 'lobby' };
		expect(isHandlesDependent(action)).toBe(false);
	});
});
