import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Ceiling, Floor, Pillar, Wall } from './types';

/**
 * Level-data builder helpers. The 8 level files repeat the same primitive
 * shapes (drywall walls at 6m or 9m height, laminate floors of various
 * widths, ceiling-tile ceilings at 6m). These helpers produce the typed
 * literal with sensible defaults, cutting boilerplate without inventing
 * a runtime layer — the output is just a `Primitive` object the engine
 * still serializes via `levels/build.ts`.
 *
 * Each helper takes the small set of fields that vary per level and
 * defaults the rest. Callers can still spread an override object in if a
 * specific primitive needs a non-default — the helpers don't lock anything.
 */

export interface WallOpts {
	readonly id: string;
	readonly origin: Vector3;
	readonly yaw: number;
	readonly width: number;
	readonly height?: number;
	readonly pbr?: 'drywall' | 'whiteboard';
	readonly overlay?: Wall['overlay'];
	readonly healthKit?: Wall['healthKit'];
}

/** Drywall wall, 6m default height. */
export function wall(opts: WallOpts): Wall {
	return {
		kind: 'wall',
		id: opts.id,
		origin: opts.origin,
		yaw: opts.yaw,
		width: opts.width,
		height: opts.height ?? 6,
		pbr: opts.pbr ?? 'drywall',
		...(opts.overlay !== undefined ? { overlay: opts.overlay } : {}),
		...(opts.healthKit !== undefined ? { healthKit: opts.healthKit } : {}),
	};
}

export interface FloorOpts {
	readonly id: string;
	readonly origin: Vector3;
	readonly width: number;
	readonly depth: number;
	readonly pbr?: 'carpet' | 'laminate';
	readonly yaw?: number;
}

/** Laminate floor. */
export function floor(opts: FloorOpts): Floor {
	return {
		kind: 'floor',
		id: opts.id,
		origin: opts.origin,
		yaw: opts.yaw ?? 0,
		width: opts.width,
		depth: opts.depth,
		pbr: opts.pbr ?? 'laminate',
	};
}

export interface CeilingOpts {
	readonly id: string;
	readonly origin: Vector3;
	readonly width: number;
	readonly depth: number;
	readonly height?: number;
	readonly emissiveCutouts?: Ceiling['emissiveCutouts'];
	readonly yaw?: number;
}

/** Ceiling-tile ceiling, 6m default height (matches the canonical office
 * dropped-ceiling pillar a typical level wants over its primary play area). */
export function ceiling(opts: CeilingOpts): Ceiling {
	return {
		kind: 'ceiling',
		id: opts.id,
		origin: opts.origin,
		yaw: opts.yaw ?? 0,
		width: opts.width,
		depth: opts.depth,
		pbr: 'ceiling-tile',
		height: opts.height ?? 6,
		...(opts.emissiveCutouts !== undefined ? { emissiveCutouts: opts.emissiveCutouts } : {}),
	};
}

export interface PillarOpts {
	readonly id: string;
	readonly origin: Vector3;
	readonly shape?: 'square' | 'round';
	readonly size?: number;
	readonly height?: number;
	readonly pbr?: 'drywall' | 'laminate';
	readonly yaw?: number;
}

/** Square structural pillar with sensible 0.6 × 6m office defaults. */
export function pillar(opts: PillarOpts): Pillar {
	return {
		kind: 'pillar',
		id: opts.id,
		origin: opts.origin,
		yaw: opts.yaw ?? 0,
		shape: opts.shape ?? 'square',
		size: opts.size ?? 0.6,
		height: opts.height ?? 6,
		pbr: opts.pbr ?? 'drywall',
	};
}
