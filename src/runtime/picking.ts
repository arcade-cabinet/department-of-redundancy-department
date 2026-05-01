import type { Scene } from '@babylonjs/core/scene';
import { ARCHETYPES, type EncounterDirector, JUSTICE_TARGETS } from '../encounter';

export interface PickResult {
	readonly kind: 'enemy' | 'civilian' | 'health-kit' | 'air';
	readonly enemyId?: string;
	readonly civilianId?: string;
	readonly healthKitId?: string;
	readonly target?: 'head' | 'body' | 'justice';
}

/**
 * Hit-test against the gameplay scene. Reads enemy/civilian/health-kit ids
 * from the picked mesh's `metadata` (set by `levels/build.ts` and the
 * civilian / health-kit spawners). Returns `{ kind: 'air' }` on a missing
 * scene or a non-tagged mesh.
 *
 * The head/body/justice routing for enemies measures pickedPoint.y against
 * the capsule's vertical extent. Justice is gated on the director reporting
 * an open justice-glint window for that enemy AND the hit landing in the
 * archetype's justiceShotTarget band. Outside the window, justice picks
 * fall back to the normal head/body split.
 */
export function pickAt(
	scene: Scene | null,
	xPx: number,
	yPx: number,
	capsuleHalfHeight: number,
	director: EncounterDirector | null = null,
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
		const capsuleHeight = capsuleHalfHeight * 2;
		const fromTop = meshY + capsuleHalfHeight - hitY;
		const fromTopFrac = capsuleHeight > 0 ? fromTop / capsuleHeight : 0.5;
		// Justice routing: only when the director confirms an open window AND
		// the hit lands in the archetype-specific band. Both conditions matter
		// — without the band check, any body-hit during glint would score
		// justice (cheapens the precision-shot bonus); without the window
		// check, any tie-knot hit ever would score justice (breaks scoring).
		if (director?.isJusticeWindowOpen(meta.enemyId)) {
			const enemy = director.getEnemy(meta.enemyId);
			if (enemy) {
				const band = JUSTICE_TARGETS[ARCHETYPES[enemy.archetypeId].justiceShotTarget];
				if (Math.abs(fromTopFrac - band.bandCenter) <= band.bandTol) {
					return { kind: 'enemy', enemyId: meta.enemyId, target: 'justice' };
				}
			}
		}
		const target: 'head' | 'body' = fromTopFrac < 0.5 ? 'head' : 'body';
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
 *  - gold  → over an enemy with an OPEN justice window (precision-bonus tease)
 *  - blue  → over a civilian (don't shoot)
 *  - green → over a fresh enemy, a health kit, or air
 *  - orange→ enemy below 66% spawn HP
 *  - red   → enemy above 66% spawn HP
 *
 * Justice wins over HP-band coloring — the bonus opportunity is the
 * thing the player must notice, even on a near-dead enemy.
 */
export function reticleColorFor(
	pick: PickResult,
	director: EncounterDirector | null,
	enemySpawnHp: ReadonlyMap<string, number>,
): 'green' | 'orange' | 'red' | 'blue' | 'gold' {
	if (pick.kind === 'civilian') return 'blue';
	if (pick.kind === 'health-kit') return 'green';
	if (pick.kind !== 'enemy' || !pick.enemyId || !director) return 'green';
	if (director.isJusticeWindowOpen(pick.enemyId)) return 'gold';
	const enemy = director.getEnemy(pick.enemyId);
	const spawn = enemySpawnHp.get(pick.enemyId);
	if (!enemy || !spawn || spawn <= 0) return 'green';
	const frac = enemy.hp / spawn;
	if (frac > 0.66) return 'red';
	if (frac > 0.33) return 'orange';
	return 'green';
}
