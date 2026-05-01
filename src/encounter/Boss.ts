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
// Phase-specific fire programs are placeholders today: each phase uses an
// existing shipped program. Bespoke per-boss programs land in a follow-up
// (mini-bosses item in the directive feature queue).

export interface BossDefinition {
	readonly archetype: ArchetypeId;
	readonly hpMultiplier: number;
	readonly railIdConvention: string;
	readonly fireProgramByPhase: Readonly<Record<number, FirePatternId>>;
}

export const BOSSES: Readonly<Record<BossId, BossDefinition>> = {
	garrison: {
		archetype: 'security-guard',
		hpMultiplier: 5,
		railIdConvention: 'rail-spawn-elevator-garrison',
		fireProgramByPhase: {
			1: 'pistol-cover-pop',
		},
	},
	whitcomb: {
		archetype: 'middle-manager',
		hpMultiplier: 7,
		railIdConvention: 'rail-spawn-whitcomb',
		fireProgramByPhase: {
			1: 'mass-pop-volley',
		},
	},
	phelps: {
		archetype: 'middle-manager',
		hpMultiplier: 8,
		railIdConvention: 'rail-spawn-phelps',
		fireProgramByPhase: {
			1: 'mass-pop-volley',
			2: 'sniper-aim',
		},
	},
	crawford: {
		archetype: 'swat',
		hpMultiplier: 5,
		railIdConvention: 'rail-spawn-crawford',
		fireProgramByPhase: {
			1: 'pistol-cover-pop',
			2: 'mass-pop-volley',
		},
	},
	reaper: {
		archetype: 'reaper',
		hpMultiplier: 1,
		railIdConvention: 'rail-spawn-reaper-entry',
		fireProgramByPhase: {
			1: 'sniper-aim',
			2: 'mass-pop-volley',
			3: 'charge-sprint',
		},
	},
};

export function bossEnemyId(bossId: BossId): string {
	return `boss-${bossId}`;
}
