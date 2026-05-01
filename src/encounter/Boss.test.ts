import { describe, expect, it } from 'vitest';
import { BOSSES, bossEnemyId, bossIdForEnemy } from './Boss';

describe('bossIdForEnemy', () => {
	it('round-trips every BOSSES entry through bossEnemyId', () => {
		for (const id of Object.keys(BOSSES)) {
			expect(bossIdForEnemy(bossEnemyId(id as keyof typeof BOSSES))).toBe(id);
		}
	});

	it('returns null for non-boss enemy ids', () => {
		expect(bossIdForEnemy('grunt-001')).toBeNull();
		expect(bossIdForEnemy('boss-doesntexist')).toBeNull();
		expect(bossIdForEnemy('boss-')).toBeNull();
		expect(bossIdForEnemy('')).toBeNull();
	});
});

describe('BOSSES quarter drops', () => {
	it('every entry has a non-empty drop range', () => {
		for (const def of Object.values(BOSSES)) {
			const [min, max] = def.quarterDrop;
			expect(min).toBeGreaterThanOrEqual(0);
			expect(max).toBeGreaterThanOrEqual(min);
		}
	});

	it('the Reaper drops 5 (final-boss canon)', () => {
		expect(BOSSES.reaper.quarterDrop).toEqual([5, 5]);
	});
});

describe('BOSSES phase fire programs', () => {
	it('every mini-boss has a phase-2 fire program', () => {
		// Per docs/spec/00-overview.md the four mini-bosses are 2-phase
		// fights (regular → enraged). Phase-2 cadence is bespoke per
		// character. Without phase-2, mini-bosses play half their encounter.
		for (const id of ['garrison', 'whitcomb', 'phelps', 'crawford'] as const) {
			expect(BOSSES[id].fireProgramByPhase[2]).toBeDefined();
		}
	});

	it('the Reaper has all three phase fire programs', () => {
		expect(BOSSES.reaper.fireProgramByPhase[1]).toBe('reaper-scythe-arc');
		expect(BOSSES.reaper.fireProgramByPhase[2]).toBe('reaper-volley');
		expect(BOSSES.reaper.fireProgramByPhase[3]).toBe('reaper-rush');
	});
});

describe('BOSSES phase HP escalation', () => {
	it('the Reaper escalates HP per phase per docs/spec/02-encounter-vocabulary.md', () => {
		// 1500 → 1800 → 2200 is the spec'd escalation. Without per-phase
		// refresh the climax burned through all three programs on phase-1
		// HP and died ~67% sooner than authored.
		expect(BOSSES.reaper.hpByPhase).toEqual({ 1: 1500, 2: 1800, 3: 2200 });
	});

	it('mini-bosses use 50% HP-fraction triggers for phase 2', () => {
		for (const id of ['garrison', 'whitcomb', 'phelps', 'crawford'] as const) {
			expect(BOSSES[id].phaseTriggerByHpFraction).toEqual({ 2: 0.5 });
		}
	});

	it('the Reaper has no auto-trigger — phase transitions are level-authored', () => {
		expect(BOSSES.reaper.phaseTriggerByHpFraction).toBeUndefined();
	});
});
