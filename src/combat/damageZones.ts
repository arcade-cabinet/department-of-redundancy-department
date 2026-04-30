/**
 * Damage zone multipliers (PRQ-B6, M4). Pure math: head shots double,
 * torso is the baseline, limbs are nerfed. The runtime classifies the
 * hitscan ray's hit point against the enemy capsule's local-y to pick
 * the zone (top third = head, mid third = torso, bottom third = limbs).
 *
 * Spec §22.2: corporate-horror feedback — no HP bars on enemies, just
 * the kill tally. Per-zone damage tweaks the felt difficulty without
 * adding UI surface area.
 */

export type DamageZone = 'head' | 'torso' | 'limbs';

export const HEAD_MULTIPLIER = 2.0;
export const TORSO_MULTIPLIER = 1.0;
export const LIMB_MULTIPLIER = 0.6;

const TABLE: Readonly<Record<DamageZone, number>> = Object.freeze({
	head: HEAD_MULTIPLIER,
	torso: TORSO_MULTIPLIER,
	limbs: LIMB_MULTIPLIER,
});

export function applyZoneMultiplier(damage: number, zone: DamageZone): number {
	if (damage === 0) return 0;
	return Math.round(damage * TABLE[zone]);
}

/** Classify a hit point's local-y against the capsule's full height
 *  (-h/2..+h/2). Top third → head; mid → torso; bottom → limbs. */
export function classifyHitZone(localY: number, capsuleHalfHeight: number): DamageZone {
	if (capsuleHalfHeight <= 0) return 'torso';
	const norm = (localY + capsuleHalfHeight) / (capsuleHalfHeight * 2); // 0..1
	if (norm > 2 / 3) return 'head';
	if (norm > 1 / 3) return 'torso';
	return 'limbs';
}
