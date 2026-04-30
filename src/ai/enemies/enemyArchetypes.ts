/**
 * Per-enemy-archetype combat / perception parameters. Spec §7 row table:
 *
 *   slug          HP   walk   vision-fov  range  damage  fire-cd  notes
 *   middle-mgr    30   1.0    90°/12u     12u    8       1.0s     base
 *   policeman     50   1.1    120°/18u    18u    14      1.5s     CallBackup at 50% HP
 *   hitman        25   1.4    60°/24u     24u    22      —        Stealth/Strike/Evade
 *   swat          80   1.0    100°/16u    16u    30 AOE  2.0s     Suppress/Flank goals
 *
 * Higher-tier FSMs reuse MiddleManagerFSM's transition logic verbatim;
 * archetype params control the gameplay differences. PRQ-10 ships the
 * full tier table + the runtime mounts will import these. Special
 * abilities (CallBackup, Stealth, Strike, Evade, Suppress, Flank) live
 * in dedicated files but consult the same table for stats.
 */

export type EnemyArchetype = 'middle-manager' | 'policeman' | 'hitman' | 'swat';

export interface ArchetypeStats {
	maxHp: number;
	walkSpeed: number; // multiplier on base 1.0
	visionFovRad: number;
	visionRange: number;
	weaponDamage: number;
	weaponCooldownMs: number;
	weaponAccuracy: number; // [0,1]
	/** AOE radius for the SWAT frag-stapler. 0 = single-target. */
	weaponAoeRadius: number;
	/** Threat delta when the player kills this archetype (mirrors §10). */
	killThreatDelta: number;
}

const TABLE: Readonly<Record<EnemyArchetype, ArchetypeStats>> = Object.freeze({
	'middle-manager': Object.freeze({
		maxHp: 30,
		walkSpeed: 1.0,
		visionFovRad: (90 * Math.PI) / 180,
		visionRange: 12,
		weaponDamage: 8,
		weaponCooldownMs: 1000,
		weaponAccuracy: 0.6,
		weaponAoeRadius: 0,
		killThreatDelta: 1.0,
	}),
	policeman: Object.freeze({
		maxHp: 50,
		walkSpeed: 1.1,
		visionFovRad: (120 * Math.PI) / 180,
		visionRange: 18,
		weaponDamage: 14,
		weaponCooldownMs: 1500,
		weaponAccuracy: 0.7,
		weaponAoeRadius: 0,
		killThreatDelta: 2.0,
	}),
	hitman: Object.freeze({
		maxHp: 25,
		walkSpeed: 1.4,
		visionFovRad: (60 * Math.PI) / 180,
		visionRange: 24,
		weaponDamage: 22,
		// Hitman fires once decisively then evades; cooldown is long
		// (3s) to model the Strike→Evade rhythm rather than full-auto.
		weaponCooldownMs: 3000,
		weaponAccuracy: 0.9,
		weaponAoeRadius: 0,
		killThreatDelta: 2.5,
	}),
	swat: Object.freeze({
		maxHp: 80,
		walkSpeed: 1.0,
		visionFovRad: (100 * Math.PI) / 180,
		visionRange: 16,
		weaponDamage: 30,
		weaponCooldownMs: 2000,
		weaponAccuracy: 0.8,
		weaponAoeRadius: 1.0, // AOE frag
		killThreatDelta: 3.0,
	}),
});

export function archetypeStats(slug: EnemyArchetype): ArchetypeStats {
	return TABLE[slug];
}

/** Stealth multiplier for the hitman: while the hitman is in `stealth`
 *  state, a watching enemy or the player has their vision range halved
 *  against him. The runtime reads this in the Vision-cone check.
 */
export const HITMAN_STEALTH_VISION_MULTIPLIER = 0.5;

/** Police backup trigger: fire `CallBackup` event when a police's HP
 *  drops to or below this fraction of max. */
export const POLICE_CALL_BACKUP_HP_FRACTION = 0.5;
