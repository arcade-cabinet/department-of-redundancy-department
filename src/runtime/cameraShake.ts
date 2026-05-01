import type { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { now } from '../engine/clock';
import { rand } from '../engine/rng';

interface ShakeWindow {
	readonly intensity: number;
	readonly startMs: number;
	readonly endMs: number;
}

/**
 * Per-camera screen-shake state. One instance lives on the RuntimeContext;
 * cue handlers call `begin`, the frame loop calls `apply` once per tick.
 *
 * Shake amplitude lerps to zero linearly across the window. The previous
 * frame's offset is unwound before sampling the next one so the camera's
 * authored rail position is preserved.
 */
export class CameraShake {
	private window: ShakeWindow | null = null;
	private lastDx = 0;
	private lastDy = 0;

	begin(intensity: number, durationMs: number): void {
		const startMs = now();
		this.window = { intensity, startMs, endMs: startMs + durationMs };
	}

	/** Forget the active shake window and zero the unwind offset. Called on level/title transition. */
	reset(): void {
		this.window = null;
		this.lastDx = 0;
		this.lastDy = 0;
	}

	apply(camera: FreeCamera): void {
		camera.position.x -= this.lastDx;
		camera.position.y -= this.lastDy;
		this.lastDx = 0;
		this.lastDy = 0;
		const w = this.window;
		if (!w) return;
		const t0 = now();
		if (t0 >= w.endMs) {
			this.window = null;
			return;
		}
		const totalMs = w.endMs - w.startMs;
		const remainingMs = w.endMs - t0;
		const t = totalMs > 0 ? remainingMs / totalMs : 0;
		const amp = w.intensity * t;
		this.lastDx = (rand() - 0.5) * 2 * amp;
		this.lastDy = (rand() - 0.5) * 2 * amp;
		camera.position.x += this.lastDx;
		camera.position.y += this.lastDy;
	}
}
