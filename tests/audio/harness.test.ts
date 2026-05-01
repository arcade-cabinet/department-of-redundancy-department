import { describe, expect, it } from 'vitest';

describe('audio harness', () => {
	it('runs in a real browser with Web Audio', () => {
		expect(typeof AudioContext).toBe('function');
		expect(typeof OfflineAudioContext).toBe('function');
	});

	it('OfflineAudioContext renders deterministically', async () => {
		const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 256, sampleRate: 8000 });
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.frequency.value = 440;
		gain.gain.value = 0.5;
		osc.connect(gain).connect(ctx.destination);
		osc.start(0);
		osc.stop(256 / 8000);
		const buffer = await ctx.startRendering();
		expect(buffer.length).toBe(256);
		const samples = buffer.getChannelData(0);
		const peak = Math.max(...samples.map(Math.abs));
		expect(peak).toBeGreaterThan(0);
		expect(peak).toBeLessThanOrEqual(0.5);
	});
});
