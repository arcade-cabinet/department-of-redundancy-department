import type { BossId } from './cues';
import type { ArchetypeId } from './Enemy';
import type { FirePatternId } from './FirePattern';

// Boss controller table. Each named boss has:
// - archetype: drives mesh + base damage (from src/encounter/Enemy.ts)
// - hpMultiplier: applied to archetype.hp at spawn. Mini-bosses use 5-8× the
//   base archetype HP so they survive long enough to play their multi-phase
//   screenplay; the underlying archetypes (security-guard 80, middle-manager
//   60, swat 140) would otherwise die in 1-2 shots.
// - railIdConvention: spawn rail id the level data MUST provide. boss-spawn
//   warns and no-ops if the named rail is absent. The validator catches
//   missing rails at level-load time.
// - fireProgramByPhase: which fire program runs at each authored phase.
//
// Phase transitions don't dispose the boss — they swap its fire program.
// The boss enters at phase 1 on `boss-spawn`; each `boss-phase` cue
// transitions to the named phase (typically 2, 3 for multi-phase bosses).
//
// Each boss-phase references a bespoke fire program defined in firePatterns.ts
// (garrison-burst, whitcomb-throw, phelps-aim, phelps-snipe, crawford-suppress,
// crawford-charge, reaper-scythe-arc, reaper-volley, reaper-rush). The cadence
// + damage values reflect each named character's spec personality.

export interface BossDefinition {
	readonly archetype: ArchetypeId;
	readonly hpMultiplier: number;
	readonly railIdConvention: string;
	readonly fireProgramByPhase: Readonly<Record<number, FirePatternId>>;
	// Optional per-phase HP refresh on `boss-phase` transition. Reaper's spec
	// (docs/spec/02-encounter-vocabulary.md) demands a real escalation:
	// 1500 → 1800 → 2200 across phases 1/2/3, not a single hpMultiplier×base.
	// When this map omits a phase, `setBossPhase` does NOT touch HP — the
	// fire program swaps in place. When it has a phase, the boss's current
	// HP is set to the spec'd value on transition. Spawn HP at phase 1 is
	// also taken from this map when present, otherwise falls back to
	// `archetype.hp * hpMultiplier * difficulty.enemyHpMultiplier`.
	readonly hpByPhase?: Readonly<Record<number, number>>;
	// HP-fraction thresholds at which the director auto-emits `boss-phase`
	// to advance to the next phase (e.g. `{ 2: 0.5 }` means transition to
	// phase 2 when HP first drops below 50% of the phase-1 max). Levels no
	// longer need to author `boss-phase` cues for HP-driven mini-bosses;
	// the director owns that emission (see EncounterDirector.hitEnemy).
	readonly phaseTriggerByHpFraction?: Readonly<Record<number, number>>;
	// [min, max] inclusive — see docs/spec/06-economy.md.
	// Mini-bosses drop 1–2 quarters on phase clear. The Reaper drops 5.
	// Resolved via quarters.rollBossDrop(range) on enemy-kill.
	readonly quarterDrop: readonly [number, number];
}

export const BOSSES: Readonly<Record<BossId, BossDefinition>> = {
	garrison: {
		archetype: 'security-guard',
		hpMultiplier: 5,
		railIdConvention: 'rail-spawn-elevator-garrison',
		fireProgramByPhase: {
			1: 'garrison-burst',
			2: 'garrison-enraged',
		},
		// Mini-bosses are spec'd as 2-phase fights (regular → enraged) per
		// docs/spec/00-overview.md. Threshold at 50% HP per the lobby cue
		// list comment. Director auto-emits `boss-phase` when crossed.
		phaseTriggerByHpFraction: { 2: 0.5 },
		quarterDrop: [1, 2],
	},
	whitcomb: {
		archetype: 'middle-manager',
		hpMultiplier: 7,
		railIdConvention: 'rail-spawn-whitcomb',
		fireProgramByPhase: {
			1: 'whitcomb-throw',
			2: 'whitcomb-volley',
		},
		phaseTriggerByHpFraction: { 2: 0.5 },
		quarterDrop: [1, 2],
	},
	phelps: {
		archetype: 'middle-manager',
		hpMultiplier: 8,
		railIdConvention: 'rail-spawn-phelps',
		fireProgramByPhase: {
			1: 'phelps-aim',
			2: 'phelps-snipe',
		},
		phaseTriggerByHpFraction: { 2: 0.5 },
		quarterDrop: [1, 2],
	},
	crawford: {
		archetype: 'swat',
		hpMultiplier: 5,
		railIdConvention: 'rail-spawn-crawford',
		fireProgramByPhase: {
			1: 'crawford-suppress',
			2: 'crawford-charge',
		},
		phaseTriggerByHpFraction: { 2: 0.5 },
		quarterDrop: [1, 2],
	},
	reaper: {
		archetype: 'reaper',
		hpMultiplier: 1,
		railIdConvention: 'rail-spawn-reaper-entry',
		fireProgramByPhase: {
			1: 'reaper-scythe-arc',
			2: 'reaper-volley',
			3: 'reaper-rush',
		},
		// Reaper escalates HP per phase per docs/spec/02-encounter-vocabulary.md
		// — this is the final boss and the spec demands a real second/third wind.
		// Without `hpByPhase` the previous code ran phase 1 HP through all three
		// programs, so the climax died ~67% faster than spec'd.
		hpByPhase: { 1: 1500, 2: 1800, 3: 2200 },
		// Reaper phase transitions are authored as level cues triggered by
		// `boss-phase` actions in the boardroom screenplay (HP threshold +
		// scripted choreography). No auto-trigger — leave the cue to the level.
		quarterDrop: [5, 5],
	},
};

/**
 * Map an enemy id back to its BossId, if any. Returns null for non-boss
 * enemies. Used by the boss-kill hook to look up the quarter drop range.
 */
export function bossIdForEnemy(enemyId: string): BossId | null {
	if (!enemyId.startsWith('boss-')) return null;
	const tail = enemyId.slice('boss-'.length);
	return tail in BOSSES ? (tail as BossId) : null;
}

export function bossEnemyId(bossId: BossId): string {
	return `boss-${bossId}`;
}
