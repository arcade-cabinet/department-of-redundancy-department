import type { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraShake } from './cameraShake';

/**
 * Unit tests for `CameraShake`. Pin the shake-window contract:
 *
 *   1. `apply` is a no-op when no window is active.
 *   2. Each frame's offset unwinds the previous offset BEFORE sampling the
 *      next one (camera's authored rail position is preserved across
 *      multiple `apply` calls within a single window).
 *   3. Amplitude lerps to zero linearly across the window — at t=0 the
 *      offset uses the full intensity, at t=1 the window is cleared.
 *   4. `reset` zeroes the unwind offset so a subsequent `apply` doesn't
 *      double-subtract the last frame's offset.
 *
 * `now()` is sourced from `performance.now()` in node tests, and `rand()`
 * falls back to `Math.random()` (no `?seed=N` in the URL). Both are spied
 * on for full determinism.
 */

interface FakeCamera {
	position: { x: number; y: number; z: number };
}

function makeFakeCamera(): FakeCamera {
	return { position: { x: 100, y: 50, z: -10 } };
}

describe('CameraShake', () => {
	let nowSpy: ReturnType<typeof vi.spyOn>;
	let randSpy: ReturnType<typeof vi.spyOn>;
	let virtualNow = 0;
	let randSeq: number[] = [];
	let randIdx = 0;

	beforeEach(() => {
		virtualNow = 0;
		randSeq = [];
		randIdx = 0;
		nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => virtualNow);
		randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
			const v = randSeq[randIdx % randSeq.length] ?? 0.5;
			randIdx++;
			return v;
		});
	});

	afterEach(() => {
		nowSpy.mockRestore();
		randSpy.mockRestore();
	});

	it('apply is a no-op when no shake window is active', () => {
		const cam = makeFakeCamera();
		const shake = new CameraShake();
		shake.apply(cam as unknown as FreeCamera);
		expect(cam.position.x).toBe(100);
		expect(cam.position.y).toBe(50);
	});

	it('applies an offset within ±intensity at t=0 (full amplitude)', () => {
		// rand() returns 1.0 → offset = (1 - 0.5) * 2 * intensity = +intensity
		randSeq = [1.0, 0.0]; // dx, dy
		const cam = makeFakeCamera();
		const shake = new CameraShake();
		shake.begin(2, 1000);
		shake.apply(cam as unknown as FreeCamera);
		// Full intensity at start of window: dx = +2, dy = -2.
		expect(cam.position.x).toBeCloseTo(102, 5);
		expect(cam.position.y).toBeCloseTo(48, 5);
	});

	it('lerps amplitude to zero linearly across the window', () => {
		// At t=0.5, amp = intensity * 0.5 — half the offset.
		randSeq = [1.0, 0.0]; // first call: dx=+amp, dy=-amp
		const cam = makeFakeCamera();
		const shake = new CameraShake();
		shake.begin(2, 1000);
		virtualNow = 500;
		shake.apply(cam as unknown as FreeCamera);
		// remainingMs/totalMs = 500/1000 = 0.5, so amp = 2 * 0.5 = 1.
		expect(cam.position.x).toBeCloseTo(101, 5);
		expect(cam.position.y).toBeCloseTo(49, 5);
	});

	it('unwinds the previous frame offset before sampling the next one', () => {
		// Two consecutive applys must keep the camera anchored to its
		// authored x=100,y=50 baseline modulo the current frame's offset.
		// frame 1 at t=0: dx=+2, dy=-2 → cam.x=102, cam.y=48
		// frame 2 at t=0.5: should unwind +2/-2 first, then sample again
		//   with amp=1 and rand=[1.0, 0.0] → dx=+1, dy=-1 → cam.x=101, cam.y=49
		randSeq = [1.0, 0.0, 1.0, 0.0];
		const cam = makeFakeCamera();
		const shake = new CameraShake();
		shake.begin(2, 1000);

		shake.apply(cam as unknown as FreeCamera);
		expect(cam.position.x).toBeCloseTo(102, 5);

		virtualNow = 500;
		shake.apply(cam as unknown as FreeCamera);
		// If unwind didn't happen, this would be 102 + 1 = 103.
		expect(cam.position.x).toBeCloseTo(101, 5);
		expect(cam.position.y).toBeCloseTo(49, 5);
	});

	it('clears the window once nowMs reaches endMs and unwinds the final offset', () => {
		randSeq = [1.0, 0.0, 1.0, 0.0];
		const cam = makeFakeCamera();
		const shake = new CameraShake();
		shake.begin(2, 1000);

		shake.apply(cam as unknown as FreeCamera);
		expect(cam.position.x).toBeCloseTo(102, 5);

		// At t=1000, t0 >= endMs → window clears, lastDx unwound at the
		// top of apply, no new offset sampled. Camera back at authored.
		virtualNow = 1000;
		shake.apply(cam as unknown as FreeCamera);
		expect(cam.position.x).toBe(100);
		expect(cam.position.y).toBe(50);

		// Subsequent apply() with no active window must remain at authored.
		virtualNow = 1500;
		shake.apply(cam as unknown as FreeCamera);
		expect(cam.position.x).toBe(100);
		expect(cam.position.y).toBe(50);
	});

	it('reset() zeroes the unwind offset so the next apply does not double-subtract', () => {
		randSeq = [1.0, 0.0]; // dx=+intensity, dy=-intensity
		const cam = makeFakeCamera();
		const shake = new CameraShake();
		shake.begin(2, 1000);
		shake.apply(cam as unknown as FreeCamera); // cam offset to (102, 48)

		// Manually re-anchor the camera (simulating a level transition that
		// repositions the camera) and call reset.
		cam.position.x = 200;
		cam.position.y = 200;
		shake.reset();

		// After reset, apply with no active window should leave the camera
		// alone — no unwind of the stale (+2/-2) offset.
		shake.apply(cam as unknown as FreeCamera);
		expect(cam.position.x).toBe(200);
		expect(cam.position.y).toBe(200);
	});

	it('begin() replaces an active window — second begin restarts the timeline', () => {
		// First window at intensity 2 expires at 1000ms. Second begin at
		// virtualNow=500 with intensity 4 should run from 500 to 1500.
		randSeq = [1.0, 0.0, 1.0, 0.0];
		const cam = makeFakeCamera();
		const shake = new CameraShake();
		shake.begin(2, 1000);
		shake.apply(cam as unknown as FreeCamera);

		virtualNow = 500;
		shake.begin(4, 1000); // restarts at t=500 with intensity 4
		shake.apply(cam as unknown as FreeCamera);
		// Fresh window: t=0 within the new window, full amplitude 4.
		// First apply unwinds +2/-2 from frame 1, then samples
		// rand=[1.0, 0.0] giving dx=+4, dy=-4.
		expect(cam.position.x).toBeCloseTo(104, 5);
		expect(cam.position.y).toBeCloseTo(46, 5);
	});

	it('handles zero-duration windows gracefully (no NaN, no divide-by-zero)', () => {
		randSeq = [1.0, 0.0];
		const cam = makeFakeCamera();
		const shake = new CameraShake();
		// Zero-duration window: endMs == startMs. apply at the exact same
		// moment hits the t0 >= endMs branch and clears immediately.
		shake.begin(2, 0);
		shake.apply(cam as unknown as FreeCamera);
		expect(cam.position.x).toBe(100);
		expect(cam.position.y).toBe(50);
	});
});
