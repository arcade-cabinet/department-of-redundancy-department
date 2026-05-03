import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LevelHandles } from '../levels/build';
import { LightTweens } from './lightTweens';

/**
 * Unit tests for `LightTweens`. Pin every tween kind:
 *
 *   - snap         → instant intensity (and optional colour) write, NO active entry
 *   - fade         → linear intensity lerp from initial → toIntensity over durationMs
 *   - flicker      → square wave between min/max at hz Hz
 *   - colour-shift → linear RGB lerp from initial → toColor over durationMs
 *
 * Cross-cutting:
 *   - isActive(id) is true while a tween is in flight (FireAlarm checks this).
 *   - tick auto-evicts entries once nowMs ≥ endMs (final value applied first).
 *   - tick auto-evicts entries whose light has been removed from handles.
 *   - clear() drops every active entry without restoring intensities.
 *   - handle() with a missing light is a no-op.
 *
 * `now()` is sourced from `performance.now()` in node tests — spied for
 * full determinism on startMs / endMs computation.
 */

interface FakeColor {
	r: number;
	g: number;
	b: number;
	set: (r: number, g: number, b: number) => void;
}

function makeColor(r: number, g: number, b: number): FakeColor {
	const c: FakeColor = {
		r,
		g,
		b,
		set: (nr, ng, nb) => {
			c.r = nr;
			c.g = ng;
			c.b = nb;
		},
	};
	return c;
}

interface FakeLight {
	intensity: number;
	diffuse?: FakeColor;
}

function makeHandles(lights: Record<string, FakeLight>): LevelHandles {
	const map = new Map<string, FakeLight>();
	for (const [id, l] of Object.entries(lights)) map.set(id, l);
	return {
		walls: new Map(),
		floors: new Map(),
		ceilings: new Map(),
		pillars: new Map(),
		doors: new Map(),
		windows: new Map(),
		shutters: new Map(),
		whiteboards: new Map(),
		props: new Map(),
		lights: map,
		emissiveCutouts: new Map(),
		captionMaterials: [],
		healthKitMeshes: new Map(),
	} as unknown as LevelHandles;
}

describe('LightTweens', () => {
	let nowSpy: ReturnType<typeof vi.spyOn>;
	let virtualNow = 0;

	beforeEach(() => {
		virtualNow = 0;
		nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => virtualNow);
	});

	afterEach(() => {
		nowSpy.mockRestore();
	});

	describe('snap tween', () => {
		it('writes intensity instantly without registering an active entry', () => {
			const handles = makeHandles({ a: { intensity: 0.2 } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', { kind: 'snap', intensity: 0.9 });
			expect(handles.lights.get('a')?.intensity).toBe(0.9);
			expect(lt.isActive('a')).toBe(false);
		});

		it('writes colour when supplied and the light has a diffuse channel', () => {
			const diffuse = makeColor(0.1, 0.1, 0.1);
			const handles = makeHandles({ a: { intensity: 0.5, diffuse } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', { kind: 'snap', intensity: 0.5, color: [1, 0, 0] });
			expect(diffuse.r).toBe(1);
			expect(diffuse.g).toBe(0);
			expect(diffuse.b).toBe(0);
		});
	});

	describe('fade tween', () => {
		it('captures the initial intensity at handle() time, lerps to target', () => {
			const handles = makeHandles({ a: { intensity: 0.2 } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', { kind: 'fade', toIntensity: 1.0, durationMs: 1000 });
			expect(lt.isActive('a')).toBe(true);

			// At t=0, fully on `from` (no movement).
			lt.tick(handles, 0);
			expect(handles.lights.get('a')?.intensity).toBeCloseTo(0.2, 5);

			// At t=0.5, halfway.
			lt.tick(handles, 500);
			expect(handles.lights.get('a')?.intensity).toBeCloseTo(0.6, 5);

			// At t=1.0, fully on `to` AND entry evicts.
			lt.tick(handles, 1000);
			expect(handles.lights.get('a')?.intensity).toBeCloseTo(1.0, 5);
			expect(lt.isActive('a')).toBe(false);
		});

		it('clamps t to [0,1] — ticks past the deadline never overshoot', () => {
			const handles = makeHandles({ a: { intensity: 0 } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', { kind: 'fade', toIntensity: 0.5, durationMs: 100 });
			lt.tick(handles, 9999);
			expect(handles.lights.get('a')?.intensity).toBeCloseTo(0.5, 5);
		});
	});

	describe('flicker tween', () => {
		it('alternates between min and max at hz Hz', () => {
			// hz=4 → period 250ms, half-period 125ms. Phase formula:
			//   phase = (now - start) * hz / 500
			//   floor(phase) % 2 === 0 → min
			// For hz=4: dim on [0,125), max on [125,250), dim on [250,375), …
			const handles = makeHandles({ a: { intensity: 0.5 } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', {
				kind: 'flicker',
				minIntensity: 0.1,
				maxIntensity: 0.9,
				hz: 4,
				durationMs: 1000,
			});
			lt.tick(handles, 0);
			expect(handles.lights.get('a')?.intensity).toBe(0.1);
			lt.tick(handles, 125);
			expect(handles.lights.get('a')?.intensity).toBe(0.9);
			lt.tick(handles, 250);
			expect(handles.lights.get('a')?.intensity).toBe(0.1);
			lt.tick(handles, 375);
			expect(handles.lights.get('a')?.intensity).toBe(0.9);
		});

		it('evicts the entry once durationMs has elapsed', () => {
			const handles = makeHandles({ a: { intensity: 0.5 } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', {
				kind: 'flicker',
				minIntensity: 0.1,
				maxIntensity: 0.9,
				hz: 4,
				durationMs: 100,
			});
			expect(lt.isActive('a')).toBe(true);
			lt.tick(handles, 100);
			expect(lt.isActive('a')).toBe(false);
		});
	});

	describe('colour-shift tween', () => {
		it('captures initial RGB, lerps each channel linearly to toColor', () => {
			const diffuse = makeColor(1, 0, 0); // red
			const handles = makeHandles({ a: { intensity: 0.5, diffuse } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', {
				kind: 'colour-shift',
				toColor: [0, 0, 1], // blue
				durationMs: 1000,
			});

			lt.tick(handles, 0);
			expect(diffuse.r).toBeCloseTo(1, 5);
			expect(diffuse.b).toBeCloseTo(0, 5);

			lt.tick(handles, 500);
			expect(diffuse.r).toBeCloseTo(0.5, 5);
			expect(diffuse.b).toBeCloseTo(0.5, 5);

			lt.tick(handles, 1000);
			expect(diffuse.r).toBeCloseTo(0, 5);
			expect(diffuse.b).toBeCloseTo(1, 5);
			expect(lt.isActive('a')).toBe(false);
		});

		it('is a no-op when the light has no diffuse channel (defensive)', () => {
			const handles = makeHandles({ a: { intensity: 0.5 } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', {
				kind: 'colour-shift',
				toColor: [1, 1, 1],
				durationMs: 1000,
			});
			// No active entry registered; tick is a no-op.
			expect(lt.isActive('a')).toBe(false);
		});
	});

	describe('handle() guards', () => {
		it('no-ops when the light id is not in handles', () => {
			const handles = makeHandles({ present: { intensity: 0.5 } });
			const lt = new LightTweens();
			lt.handle(handles, 'absent', { kind: 'fade', toIntensity: 1.0, durationMs: 100 });
			expect(lt.isActive('absent')).toBe(false);
			expect(handles.lights.get('present')?.intensity).toBe(0.5);
		});

		it('no-ops when handles is null', () => {
			const lt = new LightTweens();
			expect(() =>
				lt.handle(null, 'a', { kind: 'fade', toIntensity: 1.0, durationMs: 100 }),
			).not.toThrow();
			expect(lt.isActive('a')).toBe(false);
		});
	});

	describe('tick() guards', () => {
		it('is a no-op when handles is null', () => {
			const lt = new LightTweens();
			lt.handle(makeHandles({ a: { intensity: 0 } }), 'a', {
				kind: 'fade',
				toIntensity: 1,
				durationMs: 100,
			});
			expect(() => lt.tick(null, 50)).not.toThrow();
		});

		it('evicts entries whose light has been removed from handles', () => {
			const handles = makeHandles({ a: { intensity: 0 } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', { kind: 'fade', toIntensity: 1, durationMs: 1000 });
			expect(lt.isActive('a')).toBe(true);

			handles.lights.delete('a');
			lt.tick(handles, 100);
			expect(lt.isActive('a')).toBe(false);
		});
	});

	describe('clear()', () => {
		it('drops every active tween without restoring intensities', () => {
			const handles = makeHandles({ a: { intensity: 0 }, b: { intensity: 0 } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', { kind: 'fade', toIntensity: 1, durationMs: 1000 });
			lt.handle(handles, 'b', {
				kind: 'flicker',
				minIntensity: 0,
				maxIntensity: 1,
				hz: 4,
				durationMs: 1000,
			});
			expect(lt.isActive('a')).toBe(true);
			expect(lt.isActive('b')).toBe(true);

			lt.tick(handles, 250);
			lt.clear();
			expect(lt.isActive('a')).toBe(false);
			expect(lt.isActive('b')).toBe(false);

			// Subsequent ticks must be no-ops on these ids.
			const aBefore = handles.lights.get('a')?.intensity;
			const bBefore = handles.lights.get('b')?.intensity;
			lt.tick(handles, 9999);
			expect(handles.lights.get('a')?.intensity).toBe(aBefore);
			expect(handles.lights.get('b')?.intensity).toBe(bBefore);
		});
	});

	describe('FireAlarm coordination via isActive', () => {
		it('isActive(id) is true while in flight, false after eviction', () => {
			const handles = makeHandles({ a: { intensity: 0 } });
			const lt = new LightTweens();
			lt.handle(handles, 'a', { kind: 'fade', toIntensity: 1, durationMs: 200 });
			expect(lt.isActive('a')).toBe(true);
			lt.tick(handles, 100);
			expect(lt.isActive('a')).toBe(true);
			lt.tick(handles, 200);
			expect(lt.isActive('a')).toBe(false);
		});
	});
});
