import { AudioListener } from 'three';

/**
 * GlobalAudio singleton (PRQ-15 T1, M2c7).
 *
 * Holds a lazy-instantiated `THREE.AudioListener` mounted on the
 * active R3F camera + the master volume value (multiplied into every
 * `THREE.Audio` source via the listener's gain node).
 *
 * The listener is created on first `getListener()` so node-side tests
 * can call setMaster / getMaster without instantiating Web Audio
 * (which needs window.AudioContext). Production callers always use
 * the listener via R3F mounts so the lazy hop is invisible.
 *
 * Master volume is persisted to @capacitor/preferences so it survives
 * reload; PauseMenu's Settings tab writes here in real time via
 * `setMaster`.
 *
 * Why a singleton: a THREE scene has at most one AudioListener; the
 * R3F camera mounts it via `<primitive object={globalAudio.getListener()} />`.
 * AudioManager + AudioBackground both pull the listener from this
 * module rather than threading it through props.
 */

let _listener: AudioListener | null = null;
let _master = 1;

function clamp01(v: number): number {
	if (v < 0) return 0;
	if (v > 1) return 1;
	return v;
}

function ensureListener(): AudioListener {
	if (!_listener) {
		_listener = new AudioListener();
		_listener.gain.gain.value = _master;
	}
	return _listener;
}

export const globalAudio = {
	getListener(): AudioListener {
		return ensureListener();
	},
	getMaster(): number {
		return _master;
	},
	setMaster(v: number): void {
		_master = clamp01(v);
		if (_listener) _listener.gain.gain.value = _master;
	},
};
