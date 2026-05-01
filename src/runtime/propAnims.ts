import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { now } from '../engine/clock';
import type { LevelHandles } from '../levels/build';

interface ActivePropAnim {
	readonly mesh: AbstractMesh;
	readonly startMs: number;
	readonly durationMs: number;
	readonly animId: 'drop' | 'roll-in';
	readonly fromX: number;
	readonly fromY: number;
	readonly fromZ: number;
	readonly toX: number;
	readonly toY: number;
	readonly toZ: number;
	readonly fromRotZ: number;
	readonly toRotZ: number;
}

/**
 * Active prop tween state. Three authored anim ids:
 *  - `shatter` — instant dispose; never lands in the active map.
 *  - `drop`    — 600ms quadratic-ease-in fall, +30° z-roll.
 *  - `roll-in` — 800ms ease-out from `rollDist` units behind the prop's
 *                facing yaw.
 */
export class PropAnims {
	private readonly active = new Map<string, ActivePropAnim>();

	clear(): void {
		this.active.clear();
	}

	handle(handles: LevelHandles | null, propId: string, animId: string): void {
		const mesh = handles?.props.get(propId);
		if (!mesh || mesh.isDisposed()) return;
		if (this.active.has(propId)) return;
		if (animId === 'shatter') {
			mesh.dispose();
			handles?.props.delete(propId);
			return;
		}
		if (animId === 'drop') {
			this.active.set(propId, {
				mesh,
				startMs: now(),
				durationMs: 600,
				animId: 'drop',
				fromX: mesh.position.x,
				fromY: mesh.position.y,
				fromZ: mesh.position.z,
				toX: mesh.position.x,
				toY: 0,
				toZ: mesh.position.z,
				fromRotZ: mesh.rotation.z,
				toRotZ: mesh.rotation.z + Math.PI / 6,
			});
			return;
		}
		if (animId === 'roll-in') {
			const yaw = mesh.rotation.y;
			const rollDist = 3;
			const destX = mesh.position.x;
			const destZ = mesh.position.z;
			this.active.set(propId, {
				mesh,
				startMs: now(),
				durationMs: 800,
				animId: 'roll-in',
				fromX: destX - Math.sin(yaw) * rollDist,
				fromY: mesh.position.y,
				fromZ: destZ - Math.cos(yaw) * rollDist,
				toX: destX,
				toY: mesh.position.y,
				toZ: destZ,
				fromRotZ: mesh.rotation.z,
				toRotZ: mesh.rotation.z,
			});
			mesh.position.x = destX - Math.sin(yaw) * rollDist;
			mesh.position.z = destZ - Math.cos(yaw) * rollDist;
			return;
		}
		console.warn(`[cue] unknown prop-anim animId '${animId}' for prop '${propId}'`);
	}

	tick(): void {
		const t0 = now();
		for (const [id, anim] of this.active) {
			const elapsed = t0 - anim.startMs;
			const t = Math.min(1, elapsed / anim.durationMs);
			const eased = anim.animId === 'drop' ? t * t : 1 - (1 - t) * (1 - t);
			anim.mesh.position.x = anim.fromX + (anim.toX - anim.fromX) * eased;
			anim.mesh.position.y = anim.fromY + (anim.toY - anim.fromY) * eased;
			anim.mesh.position.z = anim.fromZ + (anim.toZ - anim.fromZ) * eased;
			anim.mesh.rotation.z = anim.fromRotZ + (anim.toRotZ - anim.fromRotZ) * eased;
			if (t >= 1) this.active.delete(id);
		}
	}
}
