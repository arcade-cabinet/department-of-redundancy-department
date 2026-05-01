import type { BossId } from './cues';
import type { ArchetypeId } from './Enemy';
import type { FirePatternId } from './FirePattern';

// Boss controller table. Each named boss has:
// - archetype: drives mesh + base hp + base damage (from src/encounter/Enemy.ts)
// - railIdConvention: spawn rail id the level data must provide
// - fireProgramByPhase: which fire program runs at each authored phase
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
	readonly railIdConvention: string;
	readonly fireProgramByPhase: Readonly<Record<number, FirePatternId>>;
}

export const BOSSES: Readonly<Record<BossId, BossDefinition>> = {
	garrison: {
		archetype: 'security-guard',
		railIdConvention: 'rail-spawn-elevator-garrison',
		fireProgramByPhase: {
			1: 'pistol-cover-pop',
		},
	},
	whitcomb: {
		archetype: 'middle-manager',
		railIdConvention: 'rail-spawn-whitcomb',
		fireProgramByPhase: {
			1: 'mass-pop-volley',
		},
	},
	phelps: {
		archetype: 'middle-manager',
		railIdConvention: 'rail-spawn-phelps',
		fireProgramByPhase: {
			1: 'mass-pop-volley',
			2: 'sniper-aim',
		},
	},
	crawford: {
		archetype: 'swat',
		railIdConvention: 'rail-spawn-crawford',
		fireProgramByPhase: {
			1: 'pistol-cover-pop',
			2: 'mass-pop-volley',
		},
	},
	reaper: {
		archetype: 'reaper',
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
