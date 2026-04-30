import { describe, expect, it } from 'vitest';
import { Vector3 } from 'yuka';
import { BLOCK_IDS } from '@/world/blocks/BlockRegistry';
import { CHUNK_SIZE, ChunkData } from '@/world/chunk/ChunkData';
import { FLOOR_CHUNKS_X, FLOOR_CHUNKS_Z } from '@/world/generator/floor';
import { buildNavMesh } from '../navmesh/builder';
import { createPlayerVehicle } from './PlayerVehicle';

const VOXEL_SIZE = 0.4;

function flatFloor(): { chunks: ChunkData[]; originX: number; originZ: number } {
	const chunks: ChunkData[] = [];
	for (let i = 0; i < FLOOR_CHUNKS_X * FLOOR_CHUNKS_Z; i++) chunks.push(new ChunkData());
	for (const c of chunks) {
		for (let z = 0; z < CHUNK_SIZE; z++)
			for (let x = 0; x < CHUNK_SIZE; x++) {
				c.set(x, 0, z, BLOCK_IDS['carpet-floor']);
				c.set(x, 1, z, BLOCK_IDS['carpet-floor']);
			}
	}
	return { chunks, originX: -31 * VOXEL_SIZE, originZ: -31 * VOXEL_SIZE };
}

describe('PlayerVehicle', () => {
	it('starts with no path; tick returns zero velocity', () => {
		const v = createPlayerVehicle();
		expect(v.hasPath).toBe(false);
		const vel = v.tick(0.016);
		expect(vel.length()).toBe(0);
	});

	it('setPath enables follow + tick produces non-zero velocity toward waypoint', () => {
		const v = createPlayerVehicle();
		v.sync(new Vector3(0, 0.8, 0));
		v.setPath([new Vector3(0, 0.8, 0), new Vector3(5, 0.8, 0)]);
		expect(v.hasPath).toBe(true);
		const vel = v.tick(0.016);
		// Moving along +x to reach waypoint at x=5.
		expect(vel.x).toBeGreaterThan(0);
		expect(Math.abs(vel.z)).toBeLessThan(0.1);
	});

	it('clearPath cancels the follow', () => {
		const v = createPlayerVehicle();
		v.setPath([new Vector3(0, 0.8, 0), new Vector3(5, 0.8, 0)]);
		v.clearPath();
		expect(v.hasPath).toBe(false);
		expect(v.tick(0.016).length()).toBe(0);
	});

	it('pathTo on a flat navmesh succeeds; vehicle reaches goal in expected ticks', () => {
		const { chunks, originX, originZ } = flatFloor();
		const { navMesh } = buildNavMesh({ chunks, voxelSize: VOXEL_SIZE, originX, originZ });
		const v = createPlayerVehicle({ maxSpeed: 4 });
		const start = new Vector3(0, 0.8, 0);
		v.sync(start);
		const goal = new Vector3(2, 0.8, 0);
		expect(v.pathTo(navMesh, goal)).toBe(true);

		// Walk for up to 3 simulated seconds, advancing the vehicle 30Hz.
		for (let i = 0; i < 90 && !v.arrived; i++) {
			const dt = 1 / 30;
			const vel = v.tick(dt);
			// Manually integrate position (in real game, Rapier moves us
			// then we call sync(); here we let the vehicle drift).
			v.sync(
				new Vector3(
					v.vehicle.position.x + vel.x * dt,
					v.vehicle.position.y,
					v.vehicle.position.z + vel.z * dt,
				),
			);
		}
		expect(v.arrived).toBe(true);
	});

	it('pathTo to an unreachable target returns false', () => {
		const v = createPlayerVehicle();
		// Empty navmesh: build one from no chunks.
		const empty: ChunkData[] = [];
		for (let i = 0; i < FLOOR_CHUNKS_X * FLOOR_CHUNKS_Z; i++) empty.push(new ChunkData());
		const { navMesh } = buildNavMesh({
			chunks: empty,
			voxelSize: VOXEL_SIZE,
			originX: -31 * VOXEL_SIZE,
			originZ: -31 * VOXEL_SIZE,
		});
		v.sync(new Vector3(0, 0.8, 0));
		const ok = v.pathTo(navMesh, new Vector3(5, 0.8, 5));
		expect(ok).toBe(false);
		expect(v.hasPath).toBe(false);
	});

	it('setPath replaces an existing path (re-tap mid-walk)', () => {
		const v = createPlayerVehicle();
		v.sync(new Vector3(0, 0.8, 0));
		v.setPath([new Vector3(5, 0.8, 0)]);
		v.setPath([new Vector3(0, 0.8, 5)]); // new tap, different direction
		const vel = v.tick(0.016);
		expect(vel.z).toBeGreaterThan(0);
	});
});
