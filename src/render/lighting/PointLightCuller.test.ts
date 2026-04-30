import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { cullByDistance, type Lamp, MAX_POINT_LIGHTS_DEFAULT } from './PointLightCuller';

const lamp = (id: string, x: number, y: number, z: number): Lamp => ({
	id,
	position: { x, y, z },
});

describe('cullByDistance', () => {
	it('returns empty when maxActive is 0', () => {
		expect(cullByDistance([lamp('a', 0, 0, 0)], { x: 0, y: 0, z: 0 }, 0)).toEqual(new Set());
	});

	it('returns all when count <= max', () => {
		const lamps = [lamp('a', 0, 0, 0), lamp('b', 5, 0, 0)];
		expect(cullByDistance(lamps, { x: 0, y: 0, z: 0 }, 5)).toEqual(new Set(['a', 'b']));
	});

	it('selects the N closest to the camera', () => {
		const lamps = [lamp('far', 100, 0, 0), lamp('near', 1, 0, 0), lamp('mid', 10, 0, 0)];
		expect(cullByDistance(lamps, { x: 0, y: 0, z: 0 }, 2)).toEqual(new Set(['near', 'mid']));
	});

	it('breaks ties on lexicographic id (no strobing)', () => {
		const lamps = [lamp('z', 5, 0, 0), lamp('a', 5, 0, 0), lamp('m', 5, 0, 0)];
		expect(cullByDistance(lamps, { x: 0, y: 0, z: 0 }, 2)).toEqual(new Set(['a', 'm']));
	});

	it('accepts a Vector3 for cameraPos', () => {
		const lamps = [lamp('a', 0, 0, 0), lamp('b', 100, 0, 0)];
		expect(cullByDistance(lamps, new Vector3(99, 0, 0), 1)).toEqual(new Set(['b']));
	});

	it('exports sane per-tier defaults', () => {
		expect(MAX_POINT_LIGHTS_DEFAULT.mobile).toBeLessThan(MAX_POINT_LIGHTS_DEFAULT.desktop);
		expect(MAX_POINT_LIGHTS_DEFAULT.mobile).toBeGreaterThan(0);
	});
});
