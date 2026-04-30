import { Audio, AudioLoader } from 'three';
import { globalAudio } from './GlobalAudio';

/**
 * AudioManager (PRQ-15 T2, M2c7).
 *
 * Lazy buffer loader + LRU cache (max 32 entries) + play/stop API for
 * non-positional `THREE.Audio` sources. Buffers are pulled from
 * `/assets/audio/<slug>.<ext>` (OGG preferred, MP3 fallback).
 *
 * Positional vs non-positional:
 *   - This manager owns NON-positional sources (UI cues, ambience,
 *     screen-locked SFX).
 *   - Positional sources (footsteps, door creaks, weapon
 *     fires-from-enemy) attach to a Three group via
 *     `attachPositional(slug, group)` and use `THREE.PositionalAudio`
 *     internally — but that path lands when M3 wires per-entity
 *     audio. M2c7 just ships the non-positional baseline so all
 *     `audio:*` events from earlier PRQs have a real source attached.
 *
 * Missing buffer behavior: load() returns null if the asset 404s. play()
 * silently no-ops on null buffer — same shape as the font-display:swap
 * fallback (M2c1) so the build doesn't break before binaries land.
 */

const MAX_CACHE = 32;
const AUDIO_BASE = '/assets/audio';

interface CacheEntry {
	buffer: AudioBuffer | null;
	lastUsed: number;
}

const cache = new Map<string, CacheEntry>();
let _loader: AudioLoader | null = null;

function getLoader(): AudioLoader {
	if (!_loader) _loader = new AudioLoader();
	return _loader;
}

function lruEvict(): void {
	if (cache.size <= MAX_CACHE) return;
	let oldestKey: string | null = null;
	let oldestT = Infinity;
	for (const [key, entry] of cache) {
		if (entry.lastUsed < oldestT) {
			oldestT = entry.lastUsed;
			oldestKey = key;
		}
	}
	if (oldestKey) cache.delete(oldestKey);
}

/** Load an audio buffer by slug. Returns the cached buffer if present;
 *  otherwise async-loads from `/assets/audio/<slug>.ogg` (then `.mp3`).
 *  Returns null on 404 / decode failure so callers can no-op safely. */
async function load(slug: string): Promise<AudioBuffer | null> {
	const cached = cache.get(slug);
	if (cached) {
		cached.lastUsed = performance.now();
		return cached.buffer;
	}
	const loader = getLoader();
	const tryUrl = async (url: string): Promise<AudioBuffer | null> => {
		try {
			return await new Promise<AudioBuffer>((resolve, reject) => {
				loader.load(url, resolve, undefined, reject);
			});
		} catch {
			return null;
		}
	};
	const buf =
		(await tryUrl(`${AUDIO_BASE}/${slug}.ogg`)) ?? (await tryUrl(`${AUDIO_BASE}/${slug}.mp3`));
	cache.set(slug, { buffer: buf, lastUsed: performance.now() });
	lruEvict();
	return buf;
}

export interface PlayOptions {
	volume?: number;
	loop?: boolean;
	playbackRate?: number;
}

/** Fire-and-forget play. Reuses one Audio per slug — concurrent plays
 *  of the same slug overlap by chaining stop+play. For overlap-friendly
 *  effects (gunshots, footsteps), call play() on a per-instance source
 *  via `createSource(slug)`. */
async function play(slug: string, opts: PlayOptions = {}): Promise<Audio | null> {
	const buf = await load(slug);
	if (!buf) return null;
	const src = new Audio(globalAudio.getListener());
	src.setBuffer(buf);
	if (opts.loop !== undefined) src.setLoop(opts.loop);
	if (opts.volume !== undefined) src.setVolume(opts.volume);
	if (opts.playbackRate !== undefined) src.setPlaybackRate(opts.playbackRate);
	src.play();
	return src;
}

function stop(src: Audio | null): void {
	if (!src) return;
	if (src.isPlaying) src.stop();
}

/** Test-only: clear the buffer cache between runs. */
function _clearCache(): void {
	cache.clear();
}

export const audioManager = { load, play, stop, _clearCache };
