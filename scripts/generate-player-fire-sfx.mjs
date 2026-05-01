#!/usr/bin/env node
// Generate a synthesized "pew" gunshot SFX as a 22.05kHz mono WAV file.
// One-off generator: the curated audio library (PixelLoops) doesn't ship
// a gunshot pack and we don't want to add a dependency for one stinger.
// Output goes to `public/assets/audio/sfx/player-fire.wav`. Re-running is
// idempotent — same waveform every time (no RNG).
//
// Sound design: a 30ms burst of band-passed white noise + a downward
// pitched sine impulse, AR envelope (5ms attack, 80ms exponential decay).
// Reads as a stylised arcade pop, not a realistic firearm — fits DORD's
// PSX-era aesthetic.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const SAMPLE_RATE = 22050;
const DURATION_MS = 110;
const NUM_SAMPLES = Math.floor((SAMPLE_RATE * DURATION_MS) / 1000);

// Deterministic LCG so re-runs produce identical bytes (no Math.random).
let seed = 0x13371337;
function nextRandom() {
	seed = (seed * 1664525 + 1013904223) >>> 0;
	return seed / 0xffffffff;
}

const samples = new Float32Array(NUM_SAMPLES);
const ATTACK_MS = 5;
const DECAY_MS = DURATION_MS - ATTACK_MS;

// One-pole low-pass smoother to soften the noise burst.
let lpY = 0;
const LP_ALPHA = 0.45;

for (let i = 0; i < NUM_SAMPLES; i++) {
	const t = (i / SAMPLE_RATE) * 1000; // ms
	let env = 0;
	if (t < ATTACK_MS) {
		env = t / ATTACK_MS;
	} else {
		const decayPhase = (t - ATTACK_MS) / DECAY_MS;
		env = Math.exp(-decayPhase * 5); // exponential decay
	}
	// Pitched impulse — descending sweep from 800Hz to 120Hz.
	const freq = 800 - (800 - 120) * Math.min(1, t / DURATION_MS);
	const tone = Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
	// Noise burst (band-passed via the smoother).
	const noiseRaw = nextRandom() * 2 - 1;
	lpY = lpY * (1 - LP_ALPHA) + noiseRaw * LP_ALPHA;
	const noise = lpY;
	samples[i] = env * (0.6 * tone + 0.7 * noise) * 0.85;
}

// 16-bit PCM WAV header.
function writeWav(path, floatSamples, sampleRate) {
	const numFrames = floatSamples.length;
	const numChannels = 1;
	const bitsPerSample = 16;
	const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
	const blockAlign = (numChannels * bitsPerSample) / 8;
	const dataSize = numFrames * blockAlign;
	const buffer = Buffer.alloc(44 + dataSize);
	buffer.write('RIFF', 0);
	buffer.writeUInt32LE(36 + dataSize, 4);
	buffer.write('WAVE', 8);
	buffer.write('fmt ', 12);
	buffer.writeUInt32LE(16, 16); // fmt chunk size
	buffer.writeUInt16LE(1, 20); // PCM
	buffer.writeUInt16LE(numChannels, 22);
	buffer.writeUInt32LE(sampleRate, 24);
	buffer.writeUInt32LE(byteRate, 28);
	buffer.writeUInt16LE(blockAlign, 32);
	buffer.writeUInt16LE(bitsPerSample, 34);
	buffer.write('data', 36);
	buffer.writeUInt32LE(dataSize, 40);
	for (let i = 0; i < numFrames; i++) {
		const clamped = Math.max(-1, Math.min(1, floatSamples[i]));
		buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
	}
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, buffer);
	console.log(`wrote ${path} (${numFrames} samples, ${dataSize + 44} bytes)`);
}

writeWav('public/assets/audio/sfx/player-fire.wav', samples, SAMPLE_RATE);
