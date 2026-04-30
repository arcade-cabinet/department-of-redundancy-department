import { describe, expect, it } from 'vitest';
import { type AmbienceLayer, ambienceForThreat, ambienceLayers } from './ambience';

describe('ambience layers (PRQ-B4)', () => {
	it('low threat (<2) plays only managers-only base', () => {
		const layers = ambienceForThreat(0);
		expect(layers).toContain('managers-only');
		expect(layers).not.toContain('radio-chatter');
	});

	it('threat ≥ 2 adds radio-chatter', () => {
		const layers = ambienceForThreat(2.5);
		expect(layers).toContain('managers-only');
		expect(layers).toContain('radio-chatter');
		expect(layers).not.toContain('boots-thump');
	});

	it('threat ≥ 5 adds boots-thump', () => {
		const layers = ambienceForThreat(5.5);
		expect(layers).toContain('managers-only');
		expect(layers).toContain('radio-chatter');
		expect(layers).toContain('boots-thump');
		expect(layers).not.toContain('tense-drone');
	});

	it('threat ≥ 8 adds tense-drone (full stack)', () => {
		const layers = ambienceForThreat(9);
		expect(layers).toEqual(ambienceLayers());
		expect(layers).toContain('tense-drone');
	});

	it('every layer has a stable identity', () => {
		const all = ambienceLayers();
		const set = new Set<AmbienceLayer>(all);
		expect(set.size).toBe(all.length);
	});
});
