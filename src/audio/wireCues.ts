import { audioManager } from './AudioManager';
import { type AudioCueEvent, audioCues } from './cues';

/**
 * Wires the typed audioCues bus to AudioManager (PRQ-15 M2c7). Call
 * once per session at app boot; the returned `dispose` unsubscribes.
 *
 * Mapping (all stub slugs — populated from open-licensed sources by
 * a future `pnpm run assets:audio` script):
 *
 *   floor-arrival  → /assets/audio/floor-arrival.ogg (intercom page)
 *   door-open      → /assets/audio/door-open.ogg (creak + slam)
 *   door-close     → /assets/audio/door-close.ogg
 *
 * Missing-asset behavior: AudioManager.play() returns null on 404, so
 * the cue is silently swallowed until the binary lands.
 */

const SLUG_BY_EVENT: Readonly<Record<AudioCueEvent['type'], string>> = Object.freeze({
	'floor-arrival': 'floor-arrival',
	'door-open': 'door-open',
	'door-close': 'door-close',
});

export function wireAudioCues(): () => void {
	return audioCues.on((ev) => {
		const slug = SLUG_BY_EVENT[ev.type];
		if (!slug) return;
		// Fire-and-forget; void to silence the unhandled-promise lint.
		void audioManager.play(slug, { volume: 1 });
	});
}
