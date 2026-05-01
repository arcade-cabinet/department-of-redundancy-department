import type { Engine } from '@babylonjs/core/Engines/engine';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Observable } from '@babylonjs/core/Misc/observable';
import { Scene } from '@babylonjs/core/scene';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	AUDIO_BASE,
	AudioBus,
	type SoundConstructOptions,
	type SoundFactory,
	type SoundLike,
} from '../../src/audio/AudioBus';
import type { Settings } from '../../src/preferences';

interface RecordedConstruction {
	readonly name: string;
	readonly url: string;
	readonly options: SoundConstructOptions;
	readonly sound: FakeSound;
}

class FakeSound implements SoundLike {
	metadata: { targetVolume?: number } | null = {};
	readonly onEndedObservable = new Observable<unknown>();
	disposed = false;
	currentVolume: number;
	lastFadeTimeS: number | null = null;

	constructor(
		public readonly name: string,
		initialVolume: number,
	) {
		this.currentVolume = initialVolume;
	}

	setVolume(volume: number, time?: number): void {
		this.currentVolume = volume;
		this.lastFadeTimeS = time ?? null;
	}

	dispose(): void {
		this.disposed = true;
	}

	end(): void {
		this.onEndedObservable.notifyObservers(this);
	}
}

function makeRecorder(): { factory: SoundFactory; constructions: RecordedConstruction[] } {
	const constructions: RecordedConstruction[] = [];
	const factory: SoundFactory = (name, url, _scene, options) => {
		const sound = new FakeSound(name, options.volume);
		constructions.push({ name, url, options, sound });
		return sound;
	};
	return { factory, constructions };
}

const baseSettings: Settings = {
	masterVolume: 1,
	musicVolume: 1,
	sfxVolume: 1,
	hapticsEnabled: true,
};

let engine: Engine;
let scene: Scene;

beforeEach(() => {
	engine = new NullEngine();
	scene = new Scene(engine);
});

afterEach(() => {
	scene.dispose();
	engine.dispose();
});

describe('AudioBus.startAmbience', () => {
	it('builds a Sound at the prefixed URL with scaled music volume', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(
			scene,
			{ ...baseSettings, masterVolume: 0.5, musicVolume: 0.8 },
			factory,
		);

		bus.startAmbience('drone', 'ambience/ambience-drone.ogg', 0.6, true);

		expect(constructions).toHaveLength(1);
		const c = constructions[0]!;
		expect(c.name).toBe('ambience-drone');
		expect(c.url).toBe(`${AUDIO_BASE}ambience/ambience-drone.ogg`);
		expect(c.options.loop).toBe(true);
		expect(c.options.autoplay).toBe(true);
		expect(c.options.streaming).toBe(false);
		// 0.6 * 0.8 * 0.5 = 0.24
		expect(c.options.volume).toBeCloseTo(0.24, 5);
		expect(bus.hasAmbience('drone')).toBe(true);
		expect(bus.getAmbienceTargetVolume('drone')).toBe(0.6);
	});

	it('is idempotent — second call with same id is a no-op', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(scene, baseSettings, factory);

		bus.startAmbience('drone', 'a.ogg', 0.5, true);
		bus.startAmbience('drone', 'b.ogg', 0.9, true);

		expect(constructions).toHaveLength(1);
		expect(bus.getAmbienceTargetVolume('drone')).toBe(0.5);
	});

	it('non-looping ambience auto-removes from the bus on end', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(scene, baseSettings, factory);

		bus.startAmbience('one-shot-bed', 'oneshot.ogg', 0.7, false);
		expect(bus.hasAmbience('one-shot-bed')).toBe(true);

		const sound = constructions[0]!.sound;
		sound.end();

		expect(sound.disposed).toBe(true);
		expect(bus.hasAmbience('one-shot-bed')).toBe(false);
	});

	it('looping ambience does NOT register an end-observer (no auto-cleanup)', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(scene, baseSettings, factory);

		bus.startAmbience('loop-bed', 'loop.ogg', 1, true);
		const sound = constructions[0]!.sound;
		// onEndedObservable should have no observers — looping beds run forever.
		expect(sound.onEndedObservable.hasObservers()).toBe(false);
	});
});

describe('AudioBus.fadeAmbience', () => {
	it('updates target volume and dispatches setVolume with duration in seconds', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(scene, baseSettings, factory);

		bus.startAmbience('drone', 'drone.ogg', 0.6, true);
		bus.fadeAmbience('drone', 0.3, 800);

		const sound = constructions[0]!.sound;
		expect(sound.currentVolume).toBeCloseTo(0.3, 5);
		expect(sound.lastFadeTimeS).toBeCloseTo(0.8, 5);
		expect(bus.getAmbienceTargetVolume('drone')).toBe(0.3);
	});

	it('is a no-op when the layer id is unknown', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(scene, baseSettings, factory);

		bus.fadeAmbience('does-not-exist', 0.5, 100);
		expect(constructions).toHaveLength(0);
	});
});

describe('AudioBus.playStinger', () => {
	it('builds a one-shot Sound at scaled SFX volume and tracks it as active', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(scene, { ...baseSettings, sfxVolume: 0.5 }, factory);

		bus.playStinger('ui/confirm.mp3', 0.7);

		expect(constructions).toHaveLength(1);
		const c = constructions[0]!;
		expect(c.name).toBe('stinger-ui/confirm.mp3');
		expect(c.url).toBe(`${AUDIO_BASE}ui/confirm.mp3`);
		expect(c.options.autoplay).toBe(true);
		expect(c.options.loop).toBe(false);
		// 0.7 * 0.5 * 1 = 0.35
		expect(c.options.volume).toBeCloseTo(0.35, 5);
		expect(bus.activeStingerCount()).toBe(1);
	});

	it('disposes and untracks itself on end', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(scene, baseSettings, factory);

		bus.playStinger('a.ogg');
		bus.playStinger('b.ogg');
		expect(bus.activeStingerCount()).toBe(2);

		const a = constructions[0]!.sound;
		const b = constructions[1]!.sound;
		a.end();
		expect(a.disposed).toBe(true);
		expect(bus.activeStingerCount()).toBe(1);

		b.end();
		expect(bus.activeStingerCount()).toBe(0);
	});

	it('default volume of 1 still scales by master and sfx sliders', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(
			scene,
			{ ...baseSettings, masterVolume: 0.5, sfxVolume: 0.6 },
			factory,
		);
		bus.playStinger('x.ogg');
		// 1 * 0.6 * 0.5 = 0.30
		expect(constructions[0]!.options.volume).toBeCloseTo(0.3, 5);
	});

	it('clamps volume into [0,1] when sliders combine above unity', () => {
		const { factory, constructions } = makeRecorder();
		// Settings are clamped at the slider boundary in production, but the bus
		// still defends against out-of-band callers.
		const bus = new AudioBus(scene, { ...baseSettings, masterVolume: 2 }, factory);
		bus.playStinger('x.ogg', 1);
		expect(constructions[0]!.options.volume).toBe(1);
	});
});

describe('AudioBus.updateSettings', () => {
	it('re-applies scaled music volume to every live ambience layer', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(scene, baseSettings, factory);

		bus.startAmbience('a', 'a.ogg', 0.8, true);
		bus.startAmbience('b', 'b.ogg', 0.4, true);

		bus.updateSettings({ ...baseSettings, masterVolume: 0.5 });

		expect(constructions[0]!.sound.currentVolume).toBeCloseTo(0.4, 5); // 0.8 * 1 * 0.5
		expect(constructions[1]!.sound.currentVolume).toBeCloseTo(0.2, 5); // 0.4 * 1 * 0.5
		// Fade in 0.1s window for live updates.
		expect(constructions[0]!.sound.lastFadeTimeS).toBeCloseTo(0.1, 5);
	});

	it('respects the most-recent fadeAmbience target after settings change', () => {
		const { factory, constructions } = makeRecorder();
		const bus = new AudioBus(scene, baseSettings, factory);

		bus.startAmbience('drone', 'drone.ogg', 0.8, true);
		bus.fadeAmbience('drone', 0.3, 500);
		bus.updateSettings({ ...baseSettings, musicVolume: 0.5 });

		// Settings update should pick up the post-fade target (0.3), not the
		// initial layer volume (0.8). 0.3 * 0.5 * 1 = 0.15.
		expect(constructions[0]!.sound.currentVolume).toBeCloseTo(0.15, 5);
	});
});
