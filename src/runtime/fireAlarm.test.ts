import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LevelHandles } from '../levels/build';
import { FireAlarm } from './fireAlarm';

/**
 * Unit tests for `FireAlarm`. Pin:
 *
 *   1. `isActive` toggles correctly across start/clear.
 *   2. `start` snapshots base intensity per light; `clear` restores them
 *      exactly (so multiple alarm cycles don't drift the authored values).
 *   3. `tick` flips a 4Hz square wave on the lights — every 125ms phase
 *      flip between dim (15% of base) and full intensity.
 *   4. `tick` honours the `isLightDriven` veto so the per-cue `lightTweens`
 *      module wins precedence on tweened lights.
 *   5. `start` AFTER an existing `start` re-snapshots intensities (used
 *      when an alarm fires twice in a single level).
 */

interface FakeLight {
	intensity: number;
}

function makeHandles(lights: Record<string, number>): LevelHandles {
	const map = new Map<string, FakeLight>();
	for (const [id, intensity] of Object.entries(lights)) {
		map.set(id, { intensity });
	}
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

describe('FireAlarm', () => {
	let nowSpy: ReturnType<typeof vi.spyOn>;
	let virtualNow = 0;

	beforeEach(() => {
		virtualNow = 0;
		nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => virtualNow);
	});

	afterEach(() => {
		nowSpy.mockRestore();
	});

	it('isActive is false before start, true after start, false after clear', () => {
		const alarm = new FireAlarm();
		expect(alarm.isActive()).toBe(false);
		alarm.start(makeHandles({ a: 1 }));
		expect(alarm.isActive()).toBe(true);
		alarm.clear(makeHandles({ a: 1 }));
		expect(alarm.isActive()).toBe(false);
	});

	it('tick is a no-op when not active', () => {
		const alarm = new FireAlarm();
		const handles = makeHandles({ a: 0.8 });
		const before = handles.lights.get('a')?.intensity;
		alarm.tick(handles, 100, () => false);
		expect(handles.lights.get('a')?.intensity).toBe(before);
	});

	it('tick is a no-op when handles are null', () => {
		const alarm = new FireAlarm();
		alarm.start(makeHandles({ a: 1 }));
		// Should not throw.
		expect(() => alarm.tick(null, 100, () => false)).not.toThrow();
	});

	it('square-wave alternates dim (15% of base) and full per 4Hz beat', () => {
		// FLICKER_HZ = 4 Hz, so the sign flips every 125ms wall-clock time
		// (period = 250ms). The implementation uses
		//   phaseMs = (now - startedMs) * FLICKER_HZ / 500
		// with `floor(phaseMs) % 2 === 0` → dim. Compute boundaries from
		// that formula directly so the test pins the SAME code path.
		// dim when floor(elapsed * 4 / 500) % 2 === 0
		//   = floor(elapsed / 125) % 2 === 0
		// → dim on [0,125)∪[250,375)∪…  full on [125,250)∪[375,500)∪…
		const alarm = new FireAlarm();
		const handles = makeHandles({ a: 1.0, b: 0.4 });
		alarm.start(handles); // startedMs = 0

		alarm.tick(handles, 0, () => false);
		expect(handles.lights.get('a')?.intensity).toBeCloseTo(0.15, 5);
		expect(handles.lights.get('b')?.intensity).toBeCloseTo(0.06, 5);

		alarm.tick(handles, 125, () => false);
		expect(handles.lights.get('a')?.intensity).toBe(1.0);
		expect(handles.lights.get('b')?.intensity).toBe(0.4);

		alarm.tick(handles, 250, () => false);
		expect(handles.lights.get('a')?.intensity).toBeCloseTo(0.15, 5);

		alarm.tick(handles, 375, () => false);
		expect(handles.lights.get('a')?.intensity).toBe(1.0);
	});

	it('honours the isLightDriven veto — tweened lights are not flickered', () => {
		const alarm = new FireAlarm();
		const handles = makeHandles({ a: 1.0, b: 1.0 });
		alarm.start(handles);

		// Pre-write a custom value to b that the alarm would normally
		// overwrite on dim.
		const bLight = handles.lights.get('b');
		if (!bLight) throw new Error('b missing');
		bLight.intensity = 0.5;

		// Tick at a dim phase; only `a` should be flickered.
		alarm.tick(handles, 0, (id) => id === 'b');
		expect(handles.lights.get('a')?.intensity).toBeCloseTo(0.15, 5);
		// b retains the externally-tweened value untouched.
		expect(handles.lights.get('b')?.intensity).toBe(0.5);
	});

	it('clear restores every light to its snapshotted base intensity', () => {
		const alarm = new FireAlarm();
		const handles = makeHandles({ a: 0.8, b: 0.4 });
		alarm.start(handles); // snapshot: a=0.8, b=0.4

		// Drive the alarm so intensities mutate.
		alarm.tick(handles, 0, () => false);
		expect(handles.lights.get('a')?.intensity).toBeCloseTo(0.12, 5); // 0.8 * 0.15
		expect(handles.lights.get('b')?.intensity).toBeCloseTo(0.06, 5); // 0.4 * 0.15

		alarm.clear(handles);
		expect(handles.lights.get('a')?.intensity).toBeCloseTo(0.8, 5);
		expect(handles.lights.get('b')?.intensity).toBeCloseTo(0.4, 5);
		expect(alarm.isActive()).toBe(false);
	});

	it('clear is a no-op when the alarm is not active', () => {
		const alarm = new FireAlarm();
		const handles = makeHandles({ a: 0.8 });
		// Pre-write to confirm clear() leaves the value alone.
		const aLight = handles.lights.get('a');
		if (!aLight) throw new Error('a missing');
		aLight.intensity = 0.123;
		alarm.clear(handles);
		expect(handles.lights.get('a')?.intensity).toBe(0.123);
	});

	it('start re-snapshots intensities — second activation captures fresh base', () => {
		// Use case: alarm fires, gets cleared, fires again later after the
		// authored intensities have changed (e.g. lights-out cue lowered
		// them). The second window should flicker around the new base.
		const alarm = new FireAlarm();
		const handles = makeHandles({ a: 1.0 });
		alarm.start(handles); // snapshot a=1.0
		alarm.clear(handles);

		// Author lowers the light intensity to simulate a power-out cue.
		const aLight = handles.lights.get('a');
		if (!aLight) throw new Error('a missing');
		aLight.intensity = 0.4;

		// Second start re-snapshots — flicker should land on 0.4 * 0.15 = 0.06.
		alarm.start(handles);
		alarm.tick(handles, 0, () => false);
		expect(handles.lights.get('a')?.intensity).toBeCloseTo(0.06, 5);
	});
});
