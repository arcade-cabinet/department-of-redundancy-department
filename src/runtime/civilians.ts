import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';
import type { Level } from '../levels';

interface ActiveCivilian {
	readonly id: string;
	readonly path: readonly Vector3[];
	readonly speed: number;
	readonly mesh: AbstractMesh;
	t: number;
}

/**
 * Civilian rail walkers — non-threat capsules driven by authored polylines
 * in level data. Spawned by the `spawn-civilian` cue verb (one per rail
 * id), advanced by the frame loop. Disposed when:
 *  - their path length runs out (`tick` self-prunes), OR
 *  - the player shoots them (caller invokes `dispose` after `getById`), OR
 *  - the level transitions (`clear` drops every entry).
 */
export class Civilians {
	private readonly active = new Map<string, ActiveCivilian>();
	private seq = 0;

	clear(): void {
		this.active.clear();
		this.seq = 0;
	}

	getById(id: string): { mesh: AbstractMesh } | undefined {
		return this.active.get(id);
	}

	/** Drop a civilian without disposing its mesh — caller already did. */
	deleteById(id: string): void {
		this.active.delete(id);
	}

	spawn(
		scene: Scene | null,
		level: Level | null,
		railId: string,
		capsuleHeight: number,
		capsuleRadius: number,
	): void {
		if (!scene || !level) return;
		const rail = level.civilianRails.find((r) => r.id === railId);
		const head = rail?.path[0];
		if (!rail || !head || rail.path.length < 2) return;
		const id = `civ-${++this.seq}`;
		const mesh = MeshBuilder.CreateCapsule(
			`civilian-${id}`,
			{ radius: capsuleRadius, height: capsuleHeight },
			scene,
		);
		mesh.position.copyFrom(head);
		mesh.position.y += capsuleHeight / 2;
		// Civilian-blue placeholder so they read as non-threats. Reticle
		// gradient (pickAt → reticleColorFor) already returns 'blue' for the
		// enemyId-less pick; this matches the HUD signal.
		const mat = new StandardMaterial(`mat-civ-${id}`, scene);
		mat.diffuseColor = new Color3(0.25, 0.55, 0.95);
		mat.emissiveColor = new Color3(0.0, 0.05, 0.12);
		mat.specularColor = new Color3(0.05, 0.05, 0.05);
		mesh.material = mat;
		mesh.metadata = { civilianId: id };
		this.active.set(id, { id, path: rail.path, speed: rail.speed, mesh, t: 0 });
	}

	tick(dtMs: number, capsuleHeight: number): void {
		const dtS = dtMs / 1000;
		for (const civ of this.active.values()) {
			civ.t += civ.speed * dtS;
			const { position, finished } = sampleCivilianPath(civ);
			civ.mesh.position.copyFrom(position);
			civ.mesh.position.y += capsuleHeight / 2;
			if (finished) {
				civ.mesh.dispose();
				this.active.delete(civ.id);
			}
		}
	}
}

function sampleCivilianPath(civ: ActiveCivilian): { position: Vector3; finished: boolean } {
	let remaining = civ.t;
	let last: Vector3 | undefined;
	for (let i = 0; i < civ.path.length - 1; i++) {
		const a = civ.path[i];
		const b = civ.path[i + 1];
		if (!a || !b) break;
		last = b;
		const seg = Vector3.Distance(a, b);
		if (remaining <= seg) {
			const u = seg > 0 ? remaining / seg : 0;
			return { position: Vector3.Lerp(a, b, u), finished: false };
		}
		remaining -= seg;
	}
	return { position: last ?? civ.path[0] ?? Vector3.Zero(), finished: true };
}
