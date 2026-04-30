import { describe, expect, it } from 'vitest';
import { globalAudio } from './GlobalAudio';

// Node-side test: only exercises the master-volume primitive. The
// listener gain wiring is exercised by browser-tier tests when Web
// Audio is available (vitest browser project + AudioListener
// instantiation under jsdom-with-canvas).
describe('GlobalAudio singleton (master volume primitive)', () => {
	it('master volume defaults to 1', () => {
		expect(globalAudio.getMaster()).toBeCloseTo(1);
	});

	it('setMaster clamps to [0, 1]', () => {
		globalAudio.setMaster(2);
		expect(globalAudio.getMaster()).toBe(1);
		globalAudio.setMaster(-0.5);
		expect(globalAudio.getMaster()).toBe(0);
		globalAudio.setMaster(0.6);
		expect(globalAudio.getMaster()).toBeCloseTo(0.6);
		globalAudio.setMaster(1);
	});
});
