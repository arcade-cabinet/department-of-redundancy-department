import { CameraShake } from './cameraShake';
import { Civilians } from './civilians';
import { FireAlarm } from './fireAlarm';
import { LightTweens } from './lightTweens';
import { PropAnims } from './propAnims';

/**
 * Long-lived runtime services that outlast a single level. Built once at
 * boot, passed by reference to subsystems that read or mutate per-tick
 * state. Replaces module-level `let` bindings in `main.ts`.
 *
 * Per-level state (Scene, Director, AudioBus, currentLevel) is NOT stored
 * here — it lives in the level lifecycle module and rebuilds on each
 * `transition` cue.
 */
export interface RuntimeContext {
	readonly cameraShake: CameraShake;
	readonly civilians: Civilians;
	readonly fireAlarm: FireAlarm;
	readonly lightTweens: LightTweens;
	readonly propAnims: PropAnims;
}

export function createRuntimeContext(): RuntimeContext {
	return {
		cameraShake: new CameraShake(),
		civilians: new Civilians(),
		fireAlarm: new FireAlarm(),
		lightTweens: new LightTweens(),
		propAnims: new PropAnims(),
	};
}
