import type { Level } from '../levels';
import { applyDoorOpen, applyShutterState, type LevelHandles } from '../levels/build';
import type { Door, Light, Shutter } from '../levels/types';

/**
 * Pure cue handlers — functions of `(handles, level, args)`. The verbs that
 * also need to talk to audio, the scene, or level lifecycle stay in main.ts
 * for now (see PRQ C.1.5i — they migrate with `levelLifecycle.ts`).
 */

export function handleDoorCue(
	handles: LevelHandles | null,
	level: Level | null,
	doorId: string,
	to: 'open' | 'closed',
): void {
	const mesh = handles?.doors.get(doorId);
	if (!mesh || !level) return;
	const doorPrim = level.primitives.find((p): p is Door => p.kind === 'door' && p.id === doorId);
	if (doorPrim && to === 'open') applyDoorOpen(mesh, doorPrim);
}

export function handleShutterCue(
	handles: LevelHandles | null,
	level: Level | null,
	shutterId: string,
	to: 'down' | 'up' | 'half',
): void {
	const mesh = handles?.shutters.get(shutterId);
	if (!mesh || !level) return;
	const shutterPrim = level.primitives.find(
		(p): p is Shutter => p.kind === 'shutter' && p.id === shutterId,
	);
	if (shutterPrim) applyShutterState(mesh, shutterPrim, to);
}

/** Snap every light to zero intensity. Reverse with `handleLightsRestored`. */
export function handlePowerOut(handles: LevelHandles | null): void {
	if (!handles) return;
	for (const light of handles.lights.values()) light.intensity = 0;
}

/** Restore every light to the intensity declared in level data. */
export function handleLightsRestored(handles: LevelHandles | null, level: Level | null): void {
	if (!handles || !level) return;
	for (const prim of level.primitives) {
		if (prim.kind !== 'light') continue;
		const lightPrim = prim as Light;
		const bl = handles.lights.get(lightPrim.id);
		if (bl) bl.intensity = lightPrim.intensity;
	}
}

/** Open every door matching `predicate`. Used by fire-alarm + elevator-ding. */
export function openDoorsBy(
	handles: LevelHandles | null,
	level: Level | null,
	predicate: (door: Door) => boolean,
): void {
	if (!handles || !level) return;
	for (const prim of level.primitives) {
		if (prim.kind !== 'door') continue;
		const door = prim as Door;
		if (!predicate(door)) continue;
		const mesh = handles.doors.get(door.id);
		if (mesh) applyDoorOpen(mesh, door);
	}
}
