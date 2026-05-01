import { now } from '../engine/clock';
import type { LevelHandles } from '../levels/build';

const FLICKER_HZ = 4;

/**
 * Fire-alarm light flicker — a 4Hz square wave that rides on top of the
 * authored per-light intensities while the alarm is active. Audio (klaxon
 * loop) and door-opening side-effects belong to the caller; this module
 * owns ONLY the flicker state.
 *
 * On `start`, snapshots each light's current intensity so `clear` can
 * restore them exactly. `tick` pulses every alarm-driven light unless the
 * caller signals (via `isLightDriven`) that another system is currently
 * tweening that light — that lets the cue-driven `lightTweens` module win
 * the precedence battle without this module knowing about it.
 */
export class FireAlarm {
	private active = false;
	private startedMs = 0;
	private readonly baseIntensity = new Map<string, number>();

	isActive(): boolean {
		return this.active;
	}

	start(handles: LevelHandles): void {
		this.active = true;
		this.startedMs = now();
		this.baseIntensity.clear();
		for (const [id, light] of handles.lights) {
			this.baseIntensity.set(id, light.intensity);
		}
	}

	tick(
		handles: LevelHandles | null,
		nowMs: number,
		isLightDriven: (lightId: string) => boolean,
	): void {
		if (!this.active || !handles) return;
		const phaseMs = ((nowMs - this.startedMs) * FLICKER_HZ) / 500;
		const dim = Math.floor(phaseMs) % 2 === 0;
		for (const [id, light] of handles.lights) {
			if (isLightDriven(id)) continue;
			const base = this.baseIntensity.get(id) ?? light.intensity;
			light.intensity = dim ? base * 0.15 : base;
		}
	}

	/** Restore base intensities and forget the snapshot. Called on level transition. */
	clear(handles: LevelHandles | null): void {
		if (!this.active) return;
		if (handles) {
			for (const [id, light] of handles.lights) {
				const base = this.baseIntensity.get(id);
				if (base != null) light.intensity = base;
			}
		}
		this.active = false;
		this.baseIntensity.clear();
	}
}
