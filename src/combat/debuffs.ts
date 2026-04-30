/**
 * Debuff system (PRQ-13 T3). Pure-data: callers build a DebuffSet,
 * apply / tick / query it.
 *
 * **Time unit contract:** `now` and `endAt` are in **seconds**, NOT
 * milliseconds. Callers tick from a useFrame elapsed-seconds clock
 * (matches HrReaperFSM.tickInput.now).
 *
 * Today (M1) the debuff state lives + clears but is not yet read by
 * any consumer. M2 (PRESENTATION) wires it through the BlurOverlay
 * post-FX (`hasDebuff('reaper-redaction')`) and the player's speed
 * multiplier (`speedMultiplier(set)`). The producer is in place so
 * M2 only adds consumers.
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

/** Drop every active debuff. Called on floor-arrival + on player death
 *  so a 4s slow applied just before stepping through a door doesn't
 *  bleed onto the next floor (PRQ-13 reviewer-fold). */
export function clearAll(_set: DebuffSet): DebuffSet {
	return { active: [] };
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
