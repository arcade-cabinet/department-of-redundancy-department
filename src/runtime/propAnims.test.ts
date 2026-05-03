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

	describe('drop animId (gravity-fall + z-roll)', () => {
		it('registers a 600ms tween from current Y to 0 with +π/6 z-rotation', () => {
			const mesh = makeFakeMesh();
			mesh.position.y = 3;
			mesh.position.x = 1;
			mesh.position.z = 2;
			mesh.rotation.z = 0;
			const handles = makeHandles('crate', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'crate', 'drop');

			// At t=0, the easing is t² → 0, so position should still match the
			// authored from-position and rotation hasn't moved yet.
			anims.tick();
			expect(mesh.position.y).toBeCloseTo(3, 5);
			expect(mesh.position.x).toBe(1);
			expect(mesh.position.z).toBe(2);
			expect(mesh.rotation.z).toBeCloseTo(0, 5);
		});

		it('uses quadratic ease-in (t²) — at half-time, position is 25% along the path', () => {
			// Quadratic ease-in: at t=0.5, eased = 0.25. From y=4 to y=0,
			// that's 4 - (4-0) * 0.25 = 3.
			const mesh = makeFakeMesh();
			mesh.position.y = 4;
			const handles = makeHandles('crate', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'crate', 'drop');

			virtualNow = 300; // half of 600ms
			anims.tick();
			expect(mesh.position.y).toBeCloseTo(3, 5);
		});

		it('settles at the floor (y=0) with the full +π/6 z-roll at completion', () => {
			const mesh = makeFakeMesh();
			mesh.position.y = 5;
			mesh.rotation.z = 0;
			const handles = makeHandles('crate', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'crate', 'drop');

			virtualNow = 600;
			anims.tick();
			expect(mesh.position.y).toBeCloseTo(0, 5);
			expect(mesh.rotation.z).toBeCloseTo(Math.PI / 6, 5);
		});

		it('clears the active entry on completion so a re-handle starts fresh', () => {
			const mesh = makeFakeMesh();
			mesh.position.y = 5;
			const handles = makeHandles('crate', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'crate', 'drop');
			virtualNow = 700; // past 600ms
			anims.tick();

			// Move the mesh back up and re-handle. If the active entry hadn't
			// cleared, the second handle would no-op and the second tick
			// would have no effect.
			mesh.position.y = 5;
			anims.handle(handles, 'crate', 'drop'); // startMs = 700
			virtualNow = 700 + 300; // half through second tween
			anims.tick();
			// Mid-second-drop: 5 - (5-0) * 0.25 = 3.75
			expect(mesh.position.y).toBeCloseTo(3.75, 5);
		});
	});

	describe('roll-in animId (slide-in along facing yaw)', () => {
		it('snaps mesh to the start (3 units behind the destination) on registration', () => {
			// yaw=0 → sin=0, cos=1 → start is (destX, destY, destZ - 3).
			const mesh = makeFakeMesh();
			mesh.position.x = 10;
			mesh.position.y = 1;
			mesh.position.z = 5;
			mesh.rotation.y = 0;
			const handles = makeHandles('cart', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'cart', 'roll-in');

			// Pre-snap: handle() applies the start offset immediately so the
			// mesh visually appears at the start, even before the first tick.
			expect(mesh.position.x).toBeCloseTo(10, 5);
			expect(mesh.position.z).toBeCloseTo(2, 5); // 5 - cos(0)*3
		});

		it('starts behind the destination along the facing yaw and slides in over 800ms', () => {
			// yaw=π/2 (facing +x): sin=1, cos=0 → start is (destX-3, destY, destZ).
			const mesh = makeFakeMesh();
			mesh.position.x = 10;
			mesh.position.z = 5;
			mesh.rotation.y = Math.PI / 2;
			const handles = makeHandles('cart', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'cart', 'roll-in');

			// The pre-snap should set position to (10 - sin(π/2)*3, _, 5 - cos(π/2)*3)
			// = (7, _, 5).
			expect(mesh.position.x).toBeCloseTo(7, 5);
			expect(mesh.position.z).toBeCloseTo(5, 5);

			// Halfway: ease-out quadratic = 1 - (1-0.5)² = 0.75. From x=7 to
			// x=10, that's 7 + (10-7) * 0.75 = 9.25.
			virtualNow = 400;
			anims.tick();
			expect(mesh.position.x).toBeCloseTo(9.25, 5);
		});

		it('lands exactly on the destination at t=1', () => {
			const mesh = makeFakeMesh();
			mesh.position.x = 10;
			mesh.position.z = 5;
			mesh.rotation.y = 0;
			const handles = makeHandles('cart', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'cart', 'roll-in');

			virtualNow = 800;
			anims.tick();
			expect(mesh.position.x).toBeCloseTo(10, 5);
			expect(mesh.position.z).toBeCloseTo(5, 5);
		});
	});

	describe('handle() guards', () => {
		it('no-ops when the prop is missing from handles', () => {
			const mesh = makeFakeMesh();
			const handles = makeHandles('present', mesh);
			const anims = new PropAnims();

			// 'absent' is not in props — handle should silently no-op
			anims.handle(handles, 'absent', 'drop');
			virtualNow = 600;
			anims.tick();
			expect(mesh.position.y).toBe(0); // present mesh untouched
		});

		it('no-ops when the prop mesh has been disposed', () => {
			const mesh = makeFakeMesh();
			mesh.dispose(); // pre-disposed
			const handles = makeHandles('crate', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'crate', 'drop');
			// No active entry should have been registered — tick must not crash
			// and rotation/position must remain at zero.
			virtualNow = 300;
			anims.tick();
			expect(mesh.position.y).toBe(0);
		});

		it('ignores a second handle() while a tween is in flight (idempotent re-arm)', () => {
			// Without this guard, repeated cue fires would re-zero startMs and
			// stall the animation. Pin the behavior.
			const mesh = makeFakeMesh();
			mesh.position.y = 4;
			const handles = makeHandles('crate', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'crate', 'drop');
			virtualNow = 300;
			anims.tick();
			const yMid = mesh.position.y; // ~3 (quadratic ease at t=0.5)

			// Try to re-arm at t=300. Should be ignored — startMs stays at 0.
			anims.handle(handles, 'crate', 'drop');
			virtualNow = 600; // original deadline
			anims.tick();
			expect(mesh.position.y).toBeCloseTo(0, 5);
			// Sanity: the mid-value should have been within range.
			expect(yMid).toBeLessThan(4);
			expect(yMid).toBeGreaterThan(0);
		});
	});

	describe('clear() drops every active tween without disposing meshes', () => {
		it('removes pending swings/drops; subsequent ticks are no-ops', () => {
			const mesh = makeFakeMesh();
			mesh.position.y = 5;
			const handles = makeHandles('crate', mesh);
			const anims = new PropAnims();

			anims.handle(handles, 'crate', 'drop');
			anims.clear();

			// After clear: tick at deadline does nothing because the active
			// entry is gone.
			virtualNow = 600;
			anims.tick();
			expect(mesh.position.y).toBe(5);
			expect(mesh.isDisposed()).toBe(false);
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
