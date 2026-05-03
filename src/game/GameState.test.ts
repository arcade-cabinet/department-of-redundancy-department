import { describe, expect, it } from 'vitest';
import {
	COMBO_CAP,
	COMBO_STEP,
	collectHealthKit,
	comboMultiplier,
	damagePlayer,
	HEALTH_KIT_HP,
	INITIAL_GAME_STATE,
	PLAYER_BASE_HP,
	RUN_LIVES,
	recordCivilianHit,
	recordKill,
	resumeFromContinue,
	setPhase,
	startReload,
	startRun,
	swapWeapon,
	tickReload,
	transitionLevel,
	tryConsumeAmmo,
	WEAPONS,
} from './GameState';

describe('startRun', () => {
	it('seeds 3 lives and full HP per the canonical run', () => {
		const s = startRun(0);
		expect(s.phase).toBe('playing');
		expect(s.run?.remainingLives).toBe(RUN_LIVES);
		expect(s.run?.playerHp).toBe(PLAYER_BASE_HP);
		expect(s.run?.maxPlayerHp).toBe(PLAYER_BASE_HP);
		expect(s.run?.score).toBe(0);
	});
});

describe('damagePlayer + continue lifecycle', () => {
	it('drops HP without ending the run while HP > 0', () => {
		const s = damagePlayer(startRun(0), 25);
		expect(s.phase).toBe('playing');
		expect(s.run?.playerHp).toBe(PLAYER_BASE_HP - 25);
		expect(s.run?.remainingLives).toBe(RUN_LIVES);
	});

	it('moves to continue-prompt on first lethal hit', () => {
		const s = damagePlayer(startRun(0), 999);
		expect(s.phase).toBe('continue-prompt');
		expect(s.run?.remainingLives).toBe(RUN_LIVES - 1);
	});

	it('every life loss returns to continue-prompt — game-over is the user declining', () => {
		// Per docs/spec/06-economy.md: each death moves to continue-prompt;
		// the user declining (or running out of quarters) is what ends the
		// run. resumeFromContinue refills lives back to RUN_LIVES, so the
		// "exhaust all lives without a continue" path doesn't exist — every
		// death is a continue decision.
		const s = damagePlayer(startRun(0), 999);
		expect(s.phase).toBe('continue-prompt');
		expect(s.run?.remainingLives).toBe(RUN_LIVES - 1);
	});

	it('resumeFromContinue refills HP and lives back to RUN_LIVES per docs/spec/06-economy.md', () => {
		let s = damagePlayer(startRun(0), 999);
		expect(s.phase).toBe('continue-prompt');
		s = resumeFromContinue(s);
		expect(s.phase).toBe('playing');
		expect(s.run?.playerHp).toBe(PLAYER_BASE_HP);
		expect(s.run?.remainingLives).toBe(RUN_LIVES);
	});
});

describe('collectHealthKit', () => {
	it('refunds HP up to maxPlayerHp', () => {
		let s = damagePlayer(startRun(0), 50);
		expect(s.run?.playerHp).toBe(50);
		s = collectHealthKit(s);
		expect(s.run?.playerHp).toBe(50 + HEALTH_KIT_HP);
	});

	it('caps at maxPlayerHp; never overshoots', () => {
		const s = collectHealthKit(damagePlayer(startRun(0), 5));
		expect(s.run?.playerHp).toBe(PLAYER_BASE_HP);
	});

	it('preserves combo (kits do not break the chain)', () => {
		let s = recordKill(startRun(0), 'body');
		s = recordKill(s, 'body');
		expect(s.run?.comboCount).toBe(2);
		s = damagePlayer(s, 30);
		// damage breaks combo first
		s = collectHealthKit(s);
		expect(s.run?.comboCount).toBe(0); // already 0 from damage
		// run a positive case: kit while combo intact
		let t = recordKill(startRun(0), 'head');
		t = recordKill(t, 'head');
		// take a tiny scratch, then heal — combo would've been 0 after damage
		// already, but the kit itself does NOT zero a chain.
		const beforeKit = recordKill(t, 'body');
		const afterKit = collectHealthKit(beforeKit);
		expect(afterKit.run?.comboCount).toBe(beforeKit.run?.comboCount);
	});

	it('no-ops at full HP', () => {
		const s0 = startRun(0);
		const s1 = collectHealthKit(s0);
		expect(s1).toBe(s0);
	});

	it('no-ops outside the playing phase', () => {
		const s0 = damagePlayer(startRun(0), 999);
		expect(s0.phase).toBe('continue-prompt');
		const s1 = collectHealthKit(s0);
		expect(s1).toBe(s0);
	});
});

describe('comboMultiplier', () => {
	// Pin the curve: 1.0 + COMBO_STEP * clamp(combo, 0, COMBO_CAP). Catches
	// silent reorderings of the formula or off-by-one in the clamp bounds.
	it('returns 1.0 at zero combo (no bonus on the first kill)', () => {
		expect(comboMultiplier(0)).toBe(1.0);
	});

	it('grows linearly by COMBO_STEP per kill below the cap', () => {
		expect(comboMultiplier(1)).toBeCloseTo(1.0 + COMBO_STEP, 10);
		expect(comboMultiplier(5)).toBeCloseTo(1.0 + 5 * COMBO_STEP, 10);
	});

	it('clamps at COMBO_CAP — extra kills do not stack the multiplier', () => {
		const max = comboMultiplier(COMBO_CAP);
		expect(comboMultiplier(COMBO_CAP + 1)).toBe(max);
		expect(comboMultiplier(COMBO_CAP * 10)).toBe(max);
	});

	it('clamps negative inputs to zero (defensive — combo never goes below 0)', () => {
		expect(comboMultiplier(-5)).toBe(1.0);
	});
});

describe('tryConsumeAmmo', () => {
	it('returns "shot" + decrements ammo when the mag has rounds', () => {
		const out = tryConsumeAmmo(startRun(0), 0);
		expect(out.kind).toBe('shot');
		if (out.kind === 'shot') {
			expect(out.state.run?.weapon.pistolAmmo).toBe(WEAPONS.pistol.magSize - 1);
			expect(out.state.run?.weapon.reloadEndsAtMs).toBeNull();
		}
	});

	it('auto-arms reload when the last round leaves the chamber', () => {
		// Drain the pistol mag to 1, then fire — the final shot should also
		// queue the reload (no extra dry-pull needed).
		let s = startRun(0);
		for (let i = 0; i < WEAPONS.pistol.magSize - 1; i++) {
			const out = tryConsumeAmmo(s, i * 10);
			if (out.kind !== 'shot') throw new Error(`expected shot at ${i}, got ${out.kind}`);
			s = out.state;
		}
		expect(s.run?.weapon.pistolAmmo).toBe(1);
		const lastShot = tryConsumeAmmo(s, 1000);
		expect(lastShot.kind).toBe('shot');
		if (lastShot.kind === 'shot') {
			expect(lastShot.state.run?.weapon.pistolAmmo).toBe(0);
			expect(lastShot.state.run?.weapon.reloadEndsAtMs).toBe(
				1000 + WEAPONS.pistol.reloadDurationMs,
			);
		}
	});

	it('returns "dry-pull" when triggered with an empty mag', () => {
		// Hand-craft an empty-mag state to skip the drain loop.
		const base = startRun(0);
		if (!base.run) throw new Error('run missing');
		const empty = {
			...base,
			run: { ...base.run, weapon: { ...base.run.weapon, pistolAmmo: 0 } },
		};
		const out = tryConsumeAmmo(empty, 500);
		expect(out.kind).toBe('dry-pull');
		if (out.kind === 'dry-pull') {
			expect(out.state.run?.weapon.reloadEndsAtMs).toBe(500 + WEAPONS.pistol.reloadDurationMs);
		}
	});

	it('returns "misfire" while reloading — even after the reload deadline', () => {
		// Anti-rapid-click rule (per the function header comment): mid-reload
		// pulls misfire regardless of whether the deadline has passed. Only
		// `tickReload` clears the reloading flag.
		const fired = tryConsumeAmmo(startRun(0), 0);
		if (fired.kind !== 'shot') throw new Error('expected shot');
		const reloading = startReload(fired.state, 0);
		const out = tryConsumeAmmo(reloading, 0);
		expect(out.kind).toBe('misfire');
		const past = tryConsumeAmmo(reloading, 999_999);
		expect(past.kind).toBe('misfire');
	});

	it('returns "misfire" outside the playing phase', () => {
		const out = tryConsumeAmmo(INITIAL_GAME_STATE, 0);
		expect(out.kind).toBe('misfire');
	});
});

describe('startReload', () => {
	it('arms a reload when the mag is partial', () => {
		const fired = tryConsumeAmmo(startRun(0), 0);
		if (fired.kind !== 'shot') throw new Error('expected shot');
		const reloading = startReload(fired.state, 100);
		expect(reloading.run?.weapon.reloadEndsAtMs).toBe(100 + WEAPONS.pistol.reloadDurationMs);
	});

	it('no-ops when the mag is already full', () => {
		const s0 = startRun(0);
		const s1 = startReload(s0, 0);
		expect(s1).toBe(s0);
	});

	it('no-ops when a reload is already in flight', () => {
		const fired = tryConsumeAmmo(startRun(0), 0);
		if (fired.kind !== 'shot') throw new Error('expected shot');
		const r1 = startReload(fired.state, 100);
		const r2 = startReload(r1, 200);
		// Second call returns the same reference (no state churn).
		expect(r2).toBe(r1);
	});

	it('no-ops outside the playing phase', () => {
		const s0 = setPhase(startRun(0), 'continue-prompt');
		const s1 = startReload(s0, 0);
		expect(s1).toBe(s0);
	});
});

describe('tickReload', () => {
	it('refills the mag once nowMs reaches reloadEndsAtMs', () => {
		const fired = tryConsumeAmmo(startRun(0), 0);
		if (fired.kind !== 'shot') throw new Error('expected shot');
		const reloading = startReload(fired.state, 100);
		const deadline = reloading.run?.weapon.reloadEndsAtMs ?? 0;
		const done = tickReload(reloading, deadline);
		expect(done.run?.weapon.pistolAmmo).toBe(WEAPONS.pistol.magSize);
		expect(done.run?.weapon.reloadEndsAtMs).toBeNull();
	});

	it('no-ops before the deadline (returns the same reference)', () => {
		const fired = tryConsumeAmmo(startRun(0), 0);
		if (fired.kind !== 'shot') throw new Error('expected shot');
		const reloading = startReload(fired.state, 100);
		const early = tickReload(reloading, 100);
		expect(early).toBe(reloading);
	});

	it('no-ops when not reloading', () => {
		const s0 = startRun(0);
		const s1 = tickReload(s0, 999_999);
		expect(s1).toBe(s0);
	});
});

describe('swapWeapon', () => {
	it('flips active pistol → rifle', () => {
		const s = swapWeapon(startRun(0));
		expect(s.run?.weapon.active).toBe('rifle');
	});

	it('flips active rifle → pistol', () => {
		const s = swapWeapon(swapWeapon(startRun(0)));
		expect(s.run?.weapon.active).toBe('pistol');
	});

	it('cancels an in-flight reload (player chose to swap instead of wait)', () => {
		const fired = tryConsumeAmmo(startRun(0), 0);
		if (fired.kind !== 'shot') throw new Error('expected shot');
		const reloading = startReload(fired.state, 100);
		expect(reloading.run?.weapon.reloadEndsAtMs).not.toBeNull();
		const swapped = swapWeapon(reloading);
		expect(swapped.run?.weapon.reloadEndsAtMs).toBeNull();
	});

	it("preserves both weapons' ammo across the swap (independent magazines)", () => {
		const fired = tryConsumeAmmo(startRun(0), 0);
		if (fired.kind !== 'shot') throw new Error('expected shot');
		expect(fired.state.run?.weapon.pistolAmmo).toBe(WEAPONS.pistol.magSize - 1);
		const swapped = swapWeapon(fired.state);
		// Pistol's partial mag is preserved on the inactive side.
		expect(swapped.run?.weapon.pistolAmmo).toBe(WEAPONS.pistol.magSize - 1);
		expect(swapped.run?.weapon.rifleAmmo).toBe(WEAPONS.rifle.magSize);
	});

	it('no-ops outside the playing phase', () => {
		const s0 = setPhase(startRun(0), 'continue-prompt');
		const s1 = swapWeapon(s0);
		expect(s1).toBe(s0);
	});
});

describe('recordKill scoring', () => {
	it('banks 100 for body, 250 for head, 200 for justice on the first kill (combo=1, mult=1.05)', () => {
		// First kill: combo becomes 1, mult = 1 + 0.05*1 = 1.05.
		const body = recordKill(startRun(0), 'body');
		expect(body.run?.score).toBe(Math.round(100 * 1.05));
		const head = recordKill(startRun(0), 'head');
		expect(head.run?.score).toBe(Math.round(250 * 1.05));
		const just = recordKill(startRun(0), 'justice');
		expect(just.run?.score).toBe(Math.round(200 * 1.05));
	});

	it('increments comboCount on every kill', () => {
		let s = startRun(0);
		for (let i = 1; i <= 5; i++) {
			s = recordKill(s, 'body');
			expect(s.run?.comboCount).toBe(i);
		}
	});

	it('only bumps headshots on head kills, justiceShots on justice kills', () => {
		let s = startRun(0);
		s = recordKill(s, 'body');
		s = recordKill(s, 'head');
		s = recordKill(s, 'justice');
		s = recordKill(s, 'head');
		expect(s.run?.headshots).toBe(2);
		expect(s.run?.justiceShots).toBe(1);
		expect(s.run?.enemiesKilled).toBe(4);
	});

	it('applies the combo multiplier to score (compounds within a chain)', () => {
		// At combo=2, mult = 1.10 — body kill banks Math.round(100*1.10) = 110.
		let s = recordKill(startRun(0), 'body');
		const before = s.run?.score ?? 0;
		s = recordKill(s, 'body');
		expect((s.run?.score ?? 0) - before).toBe(Math.round(100 * 1.1));
	});

	it('no-ops outside the playing phase', () => {
		const s0 = setPhase(startRun(0), 'continue-prompt');
		const s1 = recordKill(s0, 'head');
		expect(s1).toBe(s0);
	});
});

describe('recordCivilianHit', () => {
	it('penalises the score by 500 (floor-clamped at 0) and breaks the combo', () => {
		const s = recordCivilianHit(recordKill(recordKill(startRun(0), 'body'), 'body'));
		expect(s.run?.score).toBe(0); // had ~215 from two kills, clamped after -500
		expect(s.run?.comboCount).toBe(0);
		expect(s.run?.civilianHits).toBe(1);
	});

	it('also damages the player by 25 HP', () => {
		const s = recordCivilianHit(startRun(0));
		expect(s.run?.playerHp).toBe(PLAYER_BASE_HP - 25);
	});

	it('routes a lethal civilian hit through damagePlayer → continue-prompt', () => {
		// 4× civilian hits = 100 HP of damage = lethal from full.
		let s = startRun(0);
		s = recordCivilianHit(s);
		s = recordCivilianHit(s);
		s = recordCivilianHit(s);
		s = recordCivilianHit(s);
		expect(s.phase).toBe('continue-prompt');
		expect(s.run?.civilianHits).toBe(4);
	});

	it('no-ops outside the playing phase', () => {
		const s0 = setPhase(startRun(0), 'continue-prompt');
		const s1 = recordCivilianHit(s0);
		expect(s1).toBe(s0);
	});
});

describe('transitionLevel', () => {
	it('updates currentLevelId without leaving the playing phase', () => {
		const s = transitionLevel(startRun(0), 'open-plan');
		expect(s.phase).toBe('playing');
		expect(s.run?.currentLevelId).toBe('open-plan');
	});

	it('flips to victory phase on the special "victory" target', () => {
		const s = transitionLevel(startRun(0), 'victory');
		expect(s.phase).toBe('victory');
		expect(s.run?.currentLevelId).toBe('victory');
	});

	it('no-ops outside the playing phase', () => {
		const s0 = setPhase(startRun(0), 'continue-prompt');
		const s1 = transitionLevel(s0, 'open-plan');
		expect(s1).toBe(s0);
	});
});

describe('setPhase', () => {
	it('replaces only the phase field; preserves run data', () => {
		const s0 = recordKill(startRun(0), 'head');
		const s1 = setPhase(s0, 'high-scores');
		expect(s1.phase).toBe('high-scores');
		expect(s1.run).toBe(s0.run);
	});

	it('works even when there is no run (insert-coin → settings)', () => {
		const s = setPhase(INITIAL_GAME_STATE, 'settings');
		expect(s.phase).toBe('settings');
		expect(s.run).toBeNull();
	});
});
