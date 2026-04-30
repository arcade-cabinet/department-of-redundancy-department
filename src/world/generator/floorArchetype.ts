/**
 * Floor archetypes (PRQ-B2, M4). Deterministic cycle of layout styles
 * keyed off the floor number — no randomness, so seeds reproduce
 * exactly. Spec §22.2 lists four archetypes; we cycle them so every
 * 4-floor band sees one of each.
 *
 * The actual maze-shape variation (corridor density, room sizes, prop
 * mix) lands in M5 polish — this commit ships the type + selector so
 * downstream code (PRQ-B3 traps, PRQ-B7 variants) can branch on it.
 */

export type FloorArchetype = 'open-plan' | 'executive-corridor' | 'basement' | 'break-room';

const CYCLE: readonly FloorArchetype[] = [
	'open-plan',
	'executive-corridor',
	'basement',
	'break-room',
] as const;

export function floorArchetypeFor(floor: number): FloorArchetype {
	if (floor < 1) return 'open-plan';
	const idx = (floor - 1) % CYCLE.length;
	const archetype = CYCLE[idx];
	if (!archetype) throw new Error(`floor archetype OOB: ${idx}`);
	return archetype;
}

export function knownFloorArchetypes(): readonly FloorArchetype[] {
	return CYCLE;
}
