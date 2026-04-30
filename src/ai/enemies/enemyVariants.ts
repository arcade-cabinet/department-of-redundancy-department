import { archetypeStats } from './enemyArchetypes';

/**
 * Enemy variants (PRQ-B7, M4). Tag-driven loadouts on top of the
 * existing archetypes. Each variant references a base archetype slug
 * + optional weapon override + optional HP/speed tweaks.
 *
 * Spec §22.2: no new GLBs — same character meshes; the tag system
 * picks a different weapon + adjusts stats so the player reads the
 * enemy as a "hardened policeman" or "sniper hitman" without an art
 * pass.
 */

export type EnemyVariant =
	| 'middle-manager-baseline'
	| 'middle-manager-faxer'
	| 'policeman-baseline'
	| 'policeman-suppressor'
	| 'hitman-baseline'
	| 'hitman-sniper'
	| 'swat-baseline'
	| 'swat-grenadier';

export interface VariantStats {
	archetype: 'middle-manager' | 'policeman' | 'hitman' | 'swat';
	weaponSlug: string;
	maxHp: number;
	walkSpeed: number;
	visionRange: number;
}

const TABLE: Readonly<Record<EnemyVariant, VariantStats>> = Object.freeze({
	'middle-manager-baseline': {
		archetype: 'middle-manager',
		weaponSlug: 'three-hole-punch',
		maxHp: archetypeStats('middle-manager').maxHp,
		walkSpeed: archetypeStats('middle-manager').walkSpeed,
		visionRange: archetypeStats('middle-manager').visionRange,
	},
	'middle-manager-faxer': {
		archetype: 'middle-manager',
		weaponSlug: 'fax-machine',
		maxHp: 35,
		walkSpeed: 1.0,
		visionRange: 14,
	},
	'policeman-baseline': {
		archetype: 'policeman',
		weaponSlug: 'three-hole-punch',
		maxHp: archetypeStats('policeman').maxHp,
		walkSpeed: archetypeStats('policeman').walkSpeed,
		visionRange: archetypeStats('policeman').visionRange,
	},
	'policeman-suppressor': {
		archetype: 'policeman',
		weaponSlug: 'toner-cannon',
		maxHp: 60,
		walkSpeed: 1.0,
		visionRange: 16,
	},
	'hitman-baseline': {
		archetype: 'hitman',
		weaponSlug: 'three-hole-punch',
		maxHp: archetypeStats('hitman').maxHp,
		walkSpeed: archetypeStats('hitman').walkSpeed,
		visionRange: archetypeStats('hitman').visionRange,
	},
	'hitman-sniper': {
		archetype: 'hitman',
		weaponSlug: 'fax-machine',
		maxHp: 22,
		walkSpeed: 1.5,
		visionRange: 28,
	},
	'swat-baseline': {
		archetype: 'swat',
		weaponSlug: 'three-hole-punch',
		maxHp: archetypeStats('swat').maxHp,
		walkSpeed: archetypeStats('swat').walkSpeed,
		visionRange: archetypeStats('swat').visionRange,
	},
	'swat-grenadier': {
		archetype: 'swat',
		weaponSlug: 'toner-cannon',
		maxHp: 90,
		walkSpeed: 0.9,
		visionRange: 18,
	},
});

export function enemyVariantStats(v: EnemyVariant): VariantStats {
	return TABLE[v];
}

export function knownVariants(): readonly EnemyVariant[] {
	return Object.keys(TABLE) as EnemyVariant[];
}
