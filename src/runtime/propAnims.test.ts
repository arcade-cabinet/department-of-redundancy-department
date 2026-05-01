import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LevelHandles } from '../levels/build';
import { PropAnims } from './propAnims';

interface FakeMesh {
	position: { x: number; y: number; z: number };
	rotation: { x: number; y: number; z: number };
	isDisposed: () => boolean;
	dispose: () => void;
}

function makeFakeMesh(): FakeMesh {
	let disposed = false;
	return {
		position: { x: 0, y: 0, z: 0 },
		rotation: { x: 0, y: 0, z: 0 },
		isDisposed: () => disposed,
		dispose: () => {
			disposed = true;
		},
	};
}

function makeHandles(propId: string, mesh: FakeMesh): LevelHandles {
	return {
		walls: new Map(),
		floors: new Map(),
		ceilings: new Map(),
		pillars: new Map(),
		doors: new Map(),
		windows: new Map(),
		shutters: new Map(),
		whiteboards: new Map(),
		props: new Map([[propId, mesh as unknown as AbstractMesh]]),
		lights: new Map(),
		emissiveCutouts: new Map(),
		captionMaterials: [],
		healthKitMeshes: new Map(),
	} as unknown as LevelHandles;
}

describe('PropAnims', () => {
	let nowSpy: ReturnType<typeof vi.spyOn>;
	let virtualNow = 0;

	beforeEach(() => {
		virtualNow = 0;
		nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => virtualNow);
	});

	afterEach(() => {
		nowSpy.mockRestore();
	});

	describe('swing animId (boardroom Phase-2 chandelier)', () => {
		it('registers an active tween when handle("swing") is called', () => {
			const mesh = makeFakeMesh();
			const handles = makeHandles('chandelier', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'chandelier', 'swing');

			// First tick should not throw and should leave rotation near 0 at t≈0
			anims.tick();
			expect(mesh.rotation.z).toBeCloseTo(0, 3);
		});

		it('advances rotation along a damped sine over 3000ms', () => {
			const mesh = makeFakeMesh();
			const handles = makeHandles('chandelier', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'chandelier', 'swing');

			// Quarter way through (750ms), the pendulum should be past zero
			// crossing into the second swing — rotation z should be nonzero
			// and bounded by the amplitude (~25° = π/7).
			virtualNow = 750;
			anims.tick();
			expect(Math.abs(mesh.rotation.z)).toBeGreaterThan(0);
			expect(Math.abs(mesh.rotation.z)).toBeLessThanOrEqual(Math.PI / 7);
		});

		it('settles at fromRotZ when the duration completes', () => {
			const mesh = makeFakeMesh();
			mesh.rotation.z = 0;
			const handles = makeHandles('chandelier', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'chandelier', 'swing');

			virtualNow = 3000;
			anims.tick();
			expect(mesh.rotation.z).toBeCloseTo(0, 5);
		});

		it('removes the tween from the active map after duration so a re-handle is honoured', () => {
			const mesh = makeFakeMesh();
			const handles = makeHandles('chandelier', mesh);
			const anims = new PropAnims();

			// First swing — drive past duration. tick() at 3001ms should
			// hit the t >= 1 branch and clear the active entry.
			anims.handle(handles, 'chandelier', 'swing');
			virtualNow = 3001;
			anims.tick();

			// Re-handle is now allowed because the active map cleared. If
			// the tween hadn't been removed, the second handle() would
			// no-op (the early `if (this.active.has(propId)) return`),
			// the second tick would do nothing, and rotation.z would
			// remain at our pre-tick zero. So a non-zero value after
			// driving to mid-swing proves the tween cleared AND a fresh
			// swing is mid-flight.
			mesh.rotation.z = 0;
			anims.handle(handles, 'chandelier', 'swing'); // captures startMs = 3001
			virtualNow = 3001 + 750; // 750ms into the second tween
			anims.tick();
			expect(Math.abs(mesh.rotation.z)).toBeGreaterThan(0);
		});
	});

	describe('shatter animId is unaffected by swing addition', () => {
		it('disposes the mesh and removes from props', () => {
			const mesh = makeFakeMesh();
			const handles = makeHandles('mug', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'mug', 'shatter');

			expect(mesh.isDisposed()).toBe(true);
			expect(handles.props.has('mug')).toBe(false);
		});
	});

	describe('unknown animId logs a warning and does nothing', () => {
		it('does not register an active tween', () => {
			const mesh = makeFakeMesh();
			const handles = makeHandles('mystery', mesh);
			const anims = new PropAnims();
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

			anims.handle(handles, 'mystery', 'fizzle');
			expect(warnSpy).toHaveBeenCalled();

			virtualNow = 100;
			anims.tick();
			expect(mesh.rotation.z).toBe(0);

			warnSpy.mockRestore();
		});
	});
});
