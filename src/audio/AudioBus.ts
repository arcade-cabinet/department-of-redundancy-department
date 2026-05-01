import { Sound } from '@babylonjs/core/Audio/sound';
import type { Observable } from '@babylonjs/core/Misc/observable';
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

export const AUDIO_BASE = '/assets/audio/';

// Defense-in-depth: every current caller passes a hard-coded TS literal, but
// the public surface accepts `string`. Reject anything that could escape the
// asset root (absolute URLs, leading slashes, parent-dir traversal) before it
// reaches Babylon's URL fetcher.
const AUDIO_FILE_RE = /^[a-z0-9_\-./]+\.(ogg|mp3|wav|m4a)$/i;
function assertSafeAudioPath(audioFile: string): void {
	if (!AUDIO_FILE_RE.test(audioFile) || audioFile.includes('..') || audioFile.startsWith('/')) {
		throw new Error(`AudioBus: refused unsafe audio path "${audioFile}"`);
	}
}

/** Minimum surface AudioBus needs from a Babylon Sound — lets tests inject a fake. */
export interface SoundLike {
	setVolume(volume: number, time?: number): void;
	dispose(): void;
	metadata: { targetVolume?: number } | null;
	readonly onEndedObservable: Observable<unknown>;
}

export interface SoundConstructOptions {
	loop: boolean;
	autoplay: boolean;
	volume: number;
	streaming: boolean;
}

export type SoundFactory = (
	name: string,
	url: string,
	scene: Scene,
	options: SoundConstructOptions,
) => SoundLike;

const defaultSoundFactory: SoundFactory = (name, url, scene, options) => {
	return new Sound(name, url, scene, () => {}, options) as unknown as SoundLike;
};

export class AudioBus {
	private readonly ambience = new Map<string, SoundLike>();
	private readonly oneShots = new Set<SoundLike>();
	private settings: Settings;
	private readonly soundFactory: SoundFactory;

	constructor(
		private readonly scene: Scene,
		settings: Settings,
		soundFactory: SoundFactory = defaultSoundFactory,
	) {
		this.settings = settings;
		this.soundFactory = soundFactory;
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
		assertSafeAudioPath(audioFile);
		const url = `${AUDIO_BASE}${audioFile}`;
		const sound = this.soundFactory(`ambience-${id}`, url, this.scene, {
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
		assertSafeAudioPath(audioFile);
		const url = `${AUDIO_BASE}${audioFile}`;
		const sound = this.soundFactory(`stinger-${audioFile}`, url, this.scene, {
			loop: false,
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

	/** Test introspection — public surface so tests can pin Map state. */
	hasAmbience(id: string): boolean {
		return this.ambience.has(id);
	}

	getAmbienceTargetVolume(id: string): number | null {
		const sound = this.ambience.get(id);
		return sound?.metadata?.targetVolume ?? null;
	}

	activeStingerCount(): number {
		return this.oneShots.size;
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
