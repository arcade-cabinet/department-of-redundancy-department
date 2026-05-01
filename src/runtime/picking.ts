import type { Scene } from '@babylonjs/core/scene';
import type { EncounterDirector } from '../encounter';

export interface PickResult {
	readonly kind: 'enemy' | 'civilian' | 'health-kit' | 'air';
	readonly enemyId?: string;
	readonly civilianId?: string;
	readonly healthKitId?: string;
	readonly target?: 'head' | 'body';
}

/**
 * Hit-test against the gameplay scene. Reads enemy/civilian/health-kit ids
 * from the picked mesh's `metadata` (set by `levels/build.ts` and the
 * civilian / health-kit spawners). Returns `{ kind: 'air' }` on a missing
 * scene or a non-tagged mesh.
 *
 * The head/body split for enemies measures pickedPoint.y against the mesh's
 * top half — caller passes `capsuleHalfHeight` so this module doesn't have
 * to know the placeholder capsule dimensions.
 */
export function pickAt(
	scene: Scene | null,
	xPx: number,
	yPx: number,
	capsuleHalfHeight: number,
): PickResult {
	if (!scene) return { kind: 'air' };
	const pick = scene.pick(xPx, yPx);
	if (!pick?.hit || !pick.pickedMesh) return { kind: 'air' };
	const meta = pick.pickedMesh.metadata as
		| { enemyId?: string; civilianId?: string; healthKitId?: string }
		| null
		| undefined;
	if (meta?.enemyId) {
		const meshY = pick.pickedMesh.position.y;
		const hitY = pick.pickedPoint?.y ?? meshY;
		const fromTop = meshY + capsuleHalfHeight - hitY;
		const target: 'head' | 'body' = fromTop < capsuleHalfHeight * 0.5 ? 'head' : 'body';
		return { kind: 'enemy', enemyId: meta.enemyId, target };
	}
	if (meta?.civilianId) {
		return { kind: 'civilian', civilianId: meta.civilianId };
	}
	if (meta?.healthKitId) {
		return { kind: 'health-kit', healthKitId: meta.healthKitId };
	}
	return { kind: 'air' };
}

/**
 * Reticle color from a pick result + per-enemy HP fraction.
 *
 *  - blue  → over a civilian (don't shoot)
 *  - green → over a fresh enemy, a health kit, or air
 *  - orange→ enemy below 66% spawn HP
 *  - red   → enemy above 66% spawn HP
 */
export function reticleColorFor(
	pick: PickResult,
	director: EncounterDirector | null,
	enemySpawnHp: ReadonlyMap<string, number>,
): 'green' | 'orange' | 'red' | 'blue' {
	if (pick.kind === 'civilian') return 'blue';
	if (pick.kind === 'health-kit') return 'green';
	if (pick.kind !== 'enemy' || !pick.enemyId || !director) return 'green';
	const enemy = director.getEnemy(pick.enemyId);
	const spawn = enemySpawnHp.get(pick.enemyId);
	if (!enemy || !spawn || spawn <= 0) return 'green';
	const frac = enemy.hp / spawn;
	if (frac > 0.66) return 'red';
	if (frac > 0.33) return 'orange';
	return 'green';
}
