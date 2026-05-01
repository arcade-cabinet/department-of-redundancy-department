import { Sound } from '@babylonjs/core/Audio/sound';
import type { Scene } from '@babylonjs/core/scene';
import type { Settings } from '../preferences';

/**
 * Audio bus — owns Babylon Sound objects for the active scene. Two channels:
 *
 *   ambience — beds keyed by AmbienceLayer.id, faded via Sound.setVolume
 *              (target, durationS) on the `ambience-fade` cue.
 *   stingers — one-shot SFX played by the `audio-stinger` cue.
 *
 * Master / music / sfx volume sliders from Settings scale every play.
 *
 * The bus is per-scene: it captures every Sound it constructs so scene.dispose()
 * cascades cleanly. main.ts re-creates it per level.
 *
 * Authoring contract:
 *   - The layer's `volume` field is the *initial* volume the bed starts at.
 *     For a fade-in, author the layer with volume:0 and add an `ambience-fade`
 *     cue at atMs:0 that ramps to the steady-state volume.
 *   - `loop` is honored — non-looping ambience plays once and frees on end.
 */

const AUDIO_BASE = '/assets/audio/';

export class AudioBus {
	private readonly ambience = new Map<string, Sound>();
	private readonly oneShots = new Set<Sound>();
	private settings: Settings;

	constructor(
		private readonly scene: Scene,
		settings: Settings,
	) {
		this.settings = settings;
	}

	updateSettings(settings: Settings): void {
		this.settings = settings;
		for (const sound of this.ambience.values()) {
			sound.setVolume(this.scaledMusicVolume(sound.metadata?.targetVolume ?? 1), 0.1);
		}
	}

	/**
	 * Begin playing an ambience layer at `volume`. Idempotent — second call
	 * with the same id is a no-op. Use `fadeAmbience` to change volume.
	 */
	startAmbience(id: string, audioFile: string, volume: number, loop: boolean): void {
		if (this.ambience.has(id)) return;
		const url = `${AUDIO_BASE}${audioFile}`;
		const sound = new Sound(`ambience-${id}`, url, this.scene, () => {}, {
			loop,
			autoplay: true,
			volume: this.scaledMusicVolume(volume),
			streaming: false,
		});
		sound.metadata = { targetVolume: volume };
		this.ambience.set(id, sound);
		if (!loop) {
			sound.onEndedObservable.add(() => {
				sound.dispose();
				this.ambience.delete(id);
			});
		}
	}

	/** Crossfade an ambience layer to `toVolume` over `durationMs`. */
	fadeAmbience(id: string, toVolume: number, durationMs: number): void {
		const sound = this.ambience.get(id);
		if (!sound) return;
		sound.metadata = { ...sound.metadata, targetVolume: toVolume };
		sound.setVolume(this.scaledMusicVolume(toVolume), durationMs / 1000);
	}

	/** One-shot stinger; disposes when finished. Cue-authored volume optional. */
	playStinger(audioFile: string, volume = 1): void {
		const url = `${AUDIO_BASE}${audioFile}`;
		const sound = new Sound(`stinger-${audioFile}`, url, this.scene, () => {}, {
			autoplay: true,
			volume: this.scaledSfxVolume(volume),
			streaming: false,
		});
		this.oneShots.add(sound);
		sound.onEndedObservable.add(() => {
			sound.dispose();
			this.oneShots.delete(sound);
		});
	}

	private scaledMusicVolume(layerVolume: number): number {
		return clamp01(layerVolume * this.settings.musicVolume * this.settings.masterVolume);
	}

	private scaledSfxVolume(sfxVolume: number): number {
		return clamp01(sfxVolume * this.settings.sfxVolume * this.settings.masterVolume);
	}
}

function clamp01(v: number): number {
	if (v < 0) return 0;
	if (v > 1) return 1;
	return v;
}
