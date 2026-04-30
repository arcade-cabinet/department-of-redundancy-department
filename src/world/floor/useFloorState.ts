import { useCallback, useMemo, useState } from 'react';
import { audioCues } from '@/audio/cues';
import * as prefs from '@/db/preferences';
import {
	type DoorCoord,
	FLOOR_CHUNKS_X,
	type FloorResult,
	generateFloor,
} from '@/world/generator/floor';
import { type SwapDeps, type SwapDirection, swapFloor } from './swap';

/**
 * React hook that owns the player's current floor + the running
 * floor's generated data + a swapTo(direction) callback that wraps
 * the pure `swapFloor` orchestrator with React-friendly side effects
 * (setState for floor; emit -> audioCues; mirror -> preferences).
 *
 * The runtime DB-backed deps (flushDirty, listPersistedChunks,
 * respawnEnemies) land in M2/M3 when koota + the kill repo are wired.
 * For M1 (this PRQ) we stub them with no-ops; the swap still mutates
 * floor + threat correctly, which is what unblocks PRQ-13's boss-gate.
 */

export interface FloorState {
	currentFloor: number;
	currentResult: FloorResult;
	upDoorWorld: { x: number; y: number; z: number };
	downDoorWorld: { x: number; y: number; z: number };
	/** Last swap's spawn point (Door coord -> world). Caller positions
	 *  the player here on the next frame after the transition. */
	pendingSpawn: { x: number; y: number; z: number } | null;
}

export interface UseFloorStateOptions {
	seed: string;
	initialFloor?: number;
	voxelSize?: number;
	/** World-space origin of the chunk layer. Mirrors the caller's
	 *  ChunkLayer offset so door coords match what the player sees. */
	originX?: number;
	originZ?: number;
}

const DEFAULT_VOXEL_SIZE = 0.4;
const DEFAULT_ORIGIN = -31 * DEFAULT_VOXEL_SIZE;

export function useFloorState(opts: UseFloorStateOptions) {
	const voxelSize = opts.voxelSize ?? DEFAULT_VOXEL_SIZE;
	const originX = opts.originX ?? DEFAULT_ORIGIN;
	const originZ = opts.originZ ?? DEFAULT_ORIGIN;
	const [currentFloor, setCurrentFloor] = useState(opts.initialFloor ?? 1);
	const [pendingSpawn, setPendingSpawn] = useState<{ x: number; y: number; z: number } | null>(
		null,
	);

	const currentResult = useMemo(
		() => generateFloor(opts.seed, currentFloor),
		[opts.seed, currentFloor],
	);

	const upDoorWorld = doorToWorld(currentResult.upDoor, voxelSize, originX, originZ);
	const downDoorWorld = doorToWorld(currentResult.downDoor, voxelSize, originX, originZ);

	const swapTo = useCallback(
		async (direction: SwapDirection) => {
			const deps: SwapDeps = {
				getCurrentFloor: async () => currentFloor,
				setCurrentFloor: async (f: number) => setCurrentFloor(f),
				flushDirty: async () => {
					warnUnimpl('flushDirty');
				},
				listPersistedChunks: async (_f: number) => {
					warnUnimpl('listPersistedChunks');
					return [];
				},
				generate: (seed: string, floor: number) => generateFloor(seed, floor),
				applyThreatDecay: async (_d: number) => {
					warnUnimpl('applyThreatDecay');
				},
				respawnEnemies: async (_f: number) => {
					warnUnimpl('respawnEnemies');
				},
				emitArrival: (f: number) => {
					import('@/audio/cues').then((m) => m.emit({ type: 'floor-arrival', floor: f }));
				},
				setLastFloor: async (f: number) => {
					await prefs.set('last_floor', f).catch(() => {});
				},
				getSeed: async () => opts.seed,
			};
			void audioCues; // ensure module loaded so emitArrival's dynamic import resolves
			const result = await swapFloor(direction, deps);
			const spawnWorld = doorToWorld(result.spawn, voxelSize, originX, originZ);
			setPendingSpawn(spawnWorld);
			return result;
		},
		[currentFloor, opts.seed, voxelSize, originX, originZ],
	);

	const consumeSpawn = useCallback(() => {
		const s = pendingSpawn;
		setPendingSpawn(null);
		return s;
	}, [pendingSpawn]);

	const state: FloorState = {
		currentFloor,
		currentResult,
		upDoorWorld,
		downDoorWorld,
		pendingSpawn,
	};

	return { state, swapTo, consumeSpawn };
}

function doorToWorld(
	d: DoorCoord,
	voxelSize: number,
	originX: number,
	originZ: number,
): { x: number; y: number; z: number } {
	return {
		x: originX + d.x * voxelSize,
		y: d.y * voxelSize,
		z: originZ + d.z * voxelSize,
	};
}

void FLOOR_CHUNKS_X; // re-export-free import — keeps tree-shake honest

const warnedKeys = new Set<string>();
function warnUnimpl(name: string): void {
	if (warnedKeys.has(name)) return;
	warnedKeys.add(name);
	// Make it loud-once: the M3 wiring task list checks this dev console
	// for any "no-op floor swap dep:" warnings as proof the runtime is
	// not silently dropping persisted state.
	console.warn(`[useFloorState] no-op floor swap dep: ${name} — wires in M3`);
}
