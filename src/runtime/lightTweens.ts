import type { LightingTween } from '../encounter';
import { now } from '../engine/clock';
import type { LevelHandles } from '../levels/build';

/**
 * Active fade / flicker / colour-shift tweens keyed by light id. The frame
 * loop drains these via `tick()`; entries auto-evict when their end time
 * passes. Cleared on level transition (caller invokes `clear()`).
 *
 * Cue-driven lighting tweens take precedence over the fire-alarm flicker.
 * `fireAlarm` queries `isActive(lightId)` to skip lights this module is
 * currently driving.
 */

type LightTween =
	| {
			readonly kind: 'fade';
			readonly fromIntensity: number;
			readonly toIntensity: number;
			readonly startMs: number;
			readonly endMs: number;
	  }
	| {
			readonly kind: 'flicker';
			readonly minIntensity: number;
			readonly maxIntensity: number;
			readonly hz: number;
			readonly startMs: number;
			readonly endMs: number;
	  }
	| {
			readonly kind: 'colour-shift';
			readonly fromColor: readonly [number, number, number];
			readonly toColor: readonly [number, number, number];
			readonly startMs: number;
			readonly endMs: number;
	  };

export class LightTweens {
	private readonly tweens = new Map<string, LightTween>();

	/** True if a tween is currently driving this light id. fireAlarm queries this. */
	isActive(lightId: string): boolean {
		return this.tweens.has(lightId);
	}

	/** Drop all active tweens. Called on level transition. */
	clear(): void {
		this.tweens.clear();
	}

	/** Install a tween from an authored `lighting` cue. */
	handle(handles: LevelHandles | null, lightId: string, tween: LightingTween): void {
		const light = handles?.lights.get(lightId);
		if (!light) return;
		if (tween.kind === 'snap') {
			light.intensity = tween.intensity;
			if (tween.color && 'diffuse' in light) {
				const [r, g, b] = tween.color;
				light.diffuse.set(r, g, b);
			}
			return;
		}
		const startMs = now();
		const endMs = startMs + tween.durationMs;
		if (tween.kind === 'fade') {
			this.tweens.set(lightId, {
				kind: 'fade',
				fromIntensity: light.intensity,
				toIntensity: tween.toIntensity,
				startMs,
				endMs,
			});
			return;
		}
		if (tween.kind === 'flicker') {
			this.tweens.set(lightId, {
				kind: 'flicker',
				minIntensity: tween.minIntensity,
				maxIntensity: tween.maxIntensity,
				hz: tween.hz,
				startMs,
				endMs,
			});
			return;
		}
		if (tween.kind === 'colour-shift' && 'diffuse' in light) {
			this.tweens.set(lightId, {
				kind: 'colour-shift',
				fromColor: [light.diffuse.r, light.diffuse.g, light.diffuse.b],
				toColor: tween.toColor,
				startMs,
				endMs,
			});
		}
	}

	/** Frame tick — apply each tween, evict expired entries. */
	tick(handles: LevelHandles | null, nowMs: number): void {
		if (!handles || this.tweens.size === 0) return;
		for (const [id, tween] of this.tweens) {
			const light = handles.lights.get(id);
			if (!light) {
				this.tweens.delete(id);
				continue;
			}
			applyLightTween(light, tween, nowMs);
			if (nowMs >= tween.endMs) this.tweens.delete(id);
		}
	}
}

function applyLightTween(
	light: {
		intensity: number;
		diffuse?: { r: number; g: number; b: number; set: (r: number, g: number, b: number) => void };
	},
	tween: LightTween,
	nowMs: number,
): void {
	const t = Math.min(1, (nowMs - tween.startMs) / Math.max(1, tween.endMs - tween.startMs));
	if (tween.kind === 'fade') {
		light.intensity = tween.fromIntensity + (tween.toIntensity - tween.fromIntensity) * t;
		return;
	}
	if (tween.kind === 'flicker') {
		const phase = ((nowMs - tween.startMs) * tween.hz) / 500;
		light.intensity = Math.floor(phase) % 2 === 0 ? tween.minIntensity : tween.maxIntensity;
		return;
	}
	if (tween.kind === 'colour-shift' && light.diffuse) {
		const [fr, fg, fb] = tween.fromColor;
		const [tr, tg, tb] = tween.toColor;
		light.diffuse.set(fr + (tr - fr) * t, fg + (tg - fg) * t, fb + (tb - fb) * t);
	}
}
