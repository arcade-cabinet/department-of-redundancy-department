/**
 * Debuff system (PRQ-13 T3). Pure-data: callers build a DebuffSet,
 * apply / tick / query it. The R3F runtime reads `speedMultiplier`
 * for player movement and `hasDebuff('reaper-redaction')` to toggle
 * the BlurOverlay post-FX.
 *
 * Alpha scope: only `reaper-redaction` (4s slow + camera blur on
 * Reaper hit). Beta adds trap debuffs and tier-escalating ailments.
 */

export type DebuffKind = 'reaper-redaction';

export const REAPER_DEBUFF_DURATION_S = 4;
export const REAPER_SPEED_MULTIPLIER = 0.6;

export interface Debuff {
	kind: DebuffKind;
	endAt: number;
}

export interface DebuffSet {
	active: Debuff[];
}

export function freshDebuffSet(): DebuffSet {
	return { active: [] };
}

export function applyDebuff(set: DebuffSet, kind: DebuffKind, now: number): DebuffSet {
	const endAt = now + REAPER_DEBUFF_DURATION_S;
	const others = set.active.filter((d) => d.kind !== kind);
	return { active: [...others, { kind, endAt }] };
}

export function clearExpired(set: DebuffSet, now: number): DebuffSet {
	const active = set.active.filter((d) => d.endAt > now);
	if (active.length === set.active.length) return set;
	return { active };
}

export function hasDebuff(set: DebuffSet, kind: DebuffKind): boolean {
	return set.active.some((d) => d.kind === kind);
}

export function speedMultiplier(set: DebuffSet): number {
	if (hasDebuff(set, 'reaper-redaction')) return REAPER_SPEED_MULTIPLIER;
	return 1;
}
