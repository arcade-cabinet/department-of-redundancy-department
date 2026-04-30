import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateFloor } from '@/world/generator/floor';
import { type SwapDeps, swapFloor } from './swap';

function deps(overrides: Partial<SwapDeps> = {}): SwapDeps {
	return {
		getCurrentFloor: vi.fn(async () => 1),
		setCurrentFloor: vi.fn(async (_f: number) => {}),
		flushDirty: vi.fn(async () => {}),
		listPersistedChunks: vi.fn(async (_f: number) => []),
		generate: vi.fn((seed: string, floor: number) => generateFloor(seed, floor)),
		applyThreatDecay: vi.fn(async (_d: number) => {}),
		respawnEnemies: vi.fn(async (_f: number) => {}),
		emitArrival: vi.fn((_f: number) => {}),
		setLastFloor: vi.fn(async (_f: number) => {}),
		getSeed: vi.fn(async () => 'seed-A'),
		...overrides,
	};
}

describe('swapFloor', () => {
	beforeEach(() => vi.clearAllMocks());

	it('up direction increments current_floor', async () => {
		const d = deps();
		await swapFloor('up', d);
		expect(d.setCurrentFloor).toHaveBeenCalledWith(2);
	});

	it('down direction decrements current_floor', async () => {
		const d = deps({ getCurrentFloor: vi.fn(async () => 3) });
		await swapFloor('down', d);
		expect(d.setCurrentFloor).toHaveBeenCalledWith(2);
	});

	it('refuses to descend below floor 1', async () => {
		const d = deps({ getCurrentFloor: vi.fn(async () => 1) });
		await expect(swapFloor('down', d)).rejects.toThrow(/below floor 1/);
	});

	it('flushes dirty chunks before swap', async () => {
		const order: string[] = [];
		const d = deps({
			flushDirty: vi.fn(async () => {
				order.push('flush');
			}),
			setCurrentFloor: vi.fn(async (_f: number) => {
				order.push('set');
			}),
		});
		await swapFloor('up', d);
		expect(order).toEqual(['flush', 'set']);
	});

	it('applies -0.5 threat decay on every floor change', async () => {
		const d = deps();
		const r = await swapFloor('up', d);
		expect(d.applyThreatDecay).toHaveBeenCalledWith(-0.5);
		expect(r.threatDelta).toBe(-0.5);
	});

	it('re-runs the spawn director on the destination floor', async () => {
		const d = deps();
		await swapFloor('up', d);
		expect(d.respawnEnemies).toHaveBeenCalledWith(2);
	});

	it('emits an arrival event for the audio cue', async () => {
		const d = deps();
		await swapFloor('up', d);
		expect(d.emitArrival).toHaveBeenCalledWith(2);
	});

	it('mirrors current_floor to last_floor preference', async () => {
		const d = deps();
		await swapFloor('up', d);
		expect(d.setLastFloor).toHaveBeenCalledWith(2);
	});

	it('returns spawn position at the opposite door of the destination', async () => {
		const d = deps({ getCurrentFloor: vi.fn(async () => 1) });
		const r = await swapFloor('up', d);
		// up direction → arriving floor's down-door is the spawn anchor.
		const dest = generateFloor('seed-A', 2);
		expect(r.spawn).toEqual(dest.downDoor);
		expect(r.destFloor).toBe(2);
	});

	it('on down, spawn is the up-door of the destination', async () => {
		const d = deps({ getCurrentFloor: vi.fn(async () => 2) });
		const r = await swapFloor('down', d);
		const dest = generateFloor('seed-A', 1);
		expect(r.spawn).toEqual(dest.upDoor);
		expect(r.destFloor).toBe(1);
	});

	it('returns the generated floor result', async () => {
		const d = deps();
		const r = await swapFloor('up', d);
		expect(r.dest.floor).toBe(2);
		expect(r.dest.seed).toBe('seed-A');
		expect(r.dest.chunks.length).toBeGreaterThan(0);
	});

	it('passes persisted chunks to caller for restore', async () => {
		const persisted = [{ floor: 2, chunkX: 0, chunkZ: 0, dirtyBlob: new Uint8Array(4) }];
		const d = deps({ listPersistedChunks: vi.fn(async (_f: number) => persisted) });
		const r = await swapFloor('up', d);
		expect(r.persisted).toEqual(persisted);
	});
});
