import { describe, expect, it } from 'vitest';
import { Vector3 } from 'yuka';
import { freshMemory, shouldInvestigate, updateMemory, VisionCone } from './Vision';

const FORWARD_X = new Vector3(1, 0, 0); // facing +X

describe('VisionCone', () => {
	it('target directly ahead within range = visible (with LOS)', () => {
		const c = new VisionCone({ fov: Math.PI / 2, range: 12 });
		const self = new Vector3(0, 0, 0);
		const target = new Vector3(5, 0, 0);
		expect(c.canSee(self, FORWARD_X, target, true)).toBe(true);
	});

	it('LOS=false → never visible', () => {
		const c = new VisionCone({ fov: Math.PI / 2, range: 12 });
		const self = new Vector3(0, 0, 0);
		const target = new Vector3(5, 0, 0);
		expect(c.canSee(self, FORWARD_X, target, false)).toBe(false);
	});

	it('out of range → invisible', () => {
		const c = new VisionCone({ fov: Math.PI / 2, range: 12 });
		const self = new Vector3(0, 0, 0);
		const target = new Vector3(15, 0, 0);
		expect(c.canSee(self, FORWARD_X, target, true)).toBe(false);
	});

	it('outside FOV cone (90° behind) → invisible', () => {
		const c = new VisionCone({ fov: Math.PI / 2, range: 12 });
		const self = new Vector3(0, 0, 0);
		const target = new Vector3(-5, 0, 0); // directly behind
		expect(c.canSee(self, FORWARD_X, target, true)).toBe(false);
	});

	it('at the FOV edge (45° off-axis with 90° fov) → visible', () => {
		const c = new VisionCone({ fov: Math.PI / 2, range: 12 });
		const self = new Vector3(0, 0, 0);
		// 45° off the +X axis = (cos45, 0, sin45) * 5
		const target = new Vector3(5 * Math.cos(Math.PI / 4), 0, 5 * Math.sin(Math.PI / 4));
		expect(c.canSee(self, FORWARD_X, target, true)).toBe(true);
	});

	it('just outside FOV edge → invisible', () => {
		const c = new VisionCone({ fov: Math.PI / 2, range: 12 });
		const self = new Vector3(0, 0, 0);
		// 50° off-axis (fov/2 = 45°)
		const target = new Vector3(
			5 * Math.cos((50 * Math.PI) / 180),
			0,
			5 * Math.sin((50 * Math.PI) / 180),
		);
		expect(c.canSee(self, FORWARD_X, target, true)).toBe(false);
	});

	it('colocated target = visible', () => {
		const c = new VisionCone({ fov: Math.PI / 2, range: 12 });
		const self = new Vector3(0, 0, 0);
		expect(c.canSee(self, FORWARD_X, self, true)).toBe(true);
	});
});

describe('MemoryRecord', () => {
	it('freshMemory has -Infinity lastSeenAt', () => {
		const m = freshMemory();
		expect(m.lastSeenAt).toBe(Number.NEGATIVE_INFINITY);
		expect(m.lastSeenPosition).toBeNull();
	});

	it('updateMemory writes when visible=true; passthrough when false', () => {
		const m = freshMemory();
		const target = new Vector3(5, 0, 5);
		const m1 = updateMemory(m, true, 10, target);
		expect(m1.lastSeenAt).toBe(10);
		expect(m1.lastSeenPosition?.x).toBe(5);
		const m2 = updateMemory(m1, false, 20, new Vector3(99, 0, 99));
		expect(m2).toBe(m1); // passthrough on invisible
	});

	it('shouldInvestigate true if lastSeenAt within window', () => {
		const m = freshMemory();
		expect(shouldInvestigate(m, 10)).toBe(false); // never seen
		const m1 = updateMemory(m, true, 10, new Vector3(0, 0, 0));
		expect(shouldInvestigate(m1, 12, 3)).toBe(true);
		expect(shouldInvestigate(m1, 14, 3)).toBe(false);
	});
});
