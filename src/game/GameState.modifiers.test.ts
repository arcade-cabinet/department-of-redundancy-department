import { describe, expect, it } from 'vitest';
import {
	damagePlayer,
	type GameState,
	recordKill,
	startReload,
	startRun,
	swapWeapon,
	tryConsumeAmmo,
	WEAPONS,
} from './GameState';

const T0 = 1_000_000;

function freshRun(modifier: 'pistol-only' | 'rifle-only' | 'no-reload' | null): GameState {
	return startRun('normal', 'three-lives', 'daily-challenge', T0, modifier);
}

describe('tryConsumeAmmo under noReload', () => {
	it('fires every trigger pull with no dry-pull frame', () => {
		let state = freshRun('no-reload');
		const mag = WEAPONS.pistol.magSize; // 8
		// Fire mag*2 + 1 = 17 trigger pulls. Every one must be a shot.
		for (let i = 0; i < mag * 2 + 1; i++) {
			const out = tryConsumeAmmo(state, T0 + i);
			expect(out.kind).toBe('shot');
			if (out.kind === 'shot') state = out.state;
		}
		// Mag is mid-cycle; never went into reload.
		expect(state.run?.weapon.reloadEndsAtMs).toBeNull();
	});

	it('mag display never reaches 0', () => {
		let state = freshRun('no-reload');
		const seen = new Set<number>();
		for (let i = 0; i < 100; i++) {
			const out = tryConsumeAmmo(state, T0 + i);
			expect(out.kind).toBe('shot');
			if (out.kind !== 'shot') break;
			state = out.state;
			seen.add(state.run?.weapon.pistolAmmo ?? -1);
		}
		expect(seen.has(0)).toBe(false);
	});

	it('produces exactly one shot per trigger pull (no phantom bullets)', () => {
		// Cycle accounting: each trigger pull is one shot, mag never empties.
		// Pistol mag 8: 8 → 7 → ... → 1 → 8 (refill on the pull that would
		// have emptied) → 7 → 6 → ... So after 8 pulls, ammo == magSize.
		let state = freshRun('no-reload');
		const mag = WEAPONS.pistol.magSize;
		for (let i = 0; i < mag; i++) {
			const out = tryConsumeAmmo(state, T0 + i);
			expect(out.kind).toBe('shot');
			if (out.kind === 'shot') state = out.state;
		}
		expect(state.run?.weapon.pistolAmmo).toBe(mag);
		expect(state.run?.weapon.reloadEndsAtMs).toBeNull();
	});
});

describe('startReload under noReload', () => {
	it('is a no-op — manual reload key does nothing', () => {
		const state = freshRun('no-reload');
		const after = startReload(state, T0 + 100);
		expect(after).toBe(state); // identity — same object reference
	});
});

describe('swapWeapon under pistol-only / rifle-only', () => {
	it('pistol-only: swap is a no-op', () => {
		const state = freshRun('pistol-only');
		expect(state.run?.weapon.active).toBe('pistol');
		const after = swapWeapon(state);
		expect(after).toBe(state);
	});

	it('rifle-only: swap is a no-op', () => {
		const state = freshRun('rifle-only');
		expect(state.run?.weapon.active).toBe('rifle');
		const after = swapWeapon(state);
		expect(after).toBe(state);
	});

	it('no-reload (without weapon lock): swap still works', () => {
		const state = freshRun('no-reload');
		const after = swapWeapon(state);
		expect(after.run?.weapon.active).toBe('rifle');
	});

	it('standard run: swap toggles', () => {
		const state = startRun('normal', 'three-lives', 'standard', T0);
		const after = swapWeapon(state);
		expect(after.run?.weapon.active).toBe('rifle');
		const back = swapWeapon(after);
		expect(back.run?.weapon.active).toBe('pistol');
	});
});

describe('startRun weapon initialisation', () => {
	it('rifle-only locks active weapon to rifle at run start', () => {
		const s = freshRun('rifle-only');
		expect(s.run?.weapon.active).toBe('rifle');
	});

	it('pistol-only locks active weapon to pistol at run start (explicit branch)', () => {
		const s = freshRun('pistol-only');
		expect(s.run?.weapon.active).toBe('pistol');
	});

	it('standard run defaults to pistol', () => {
		const s = startRun('normal', 'three-lives', 'standard', T0);
		expect(s.run?.weapon.active).toBe('pistol');
	});

	it('daily-challenge with no weapon-lock modifier defaults to pistol', () => {
		const s = freshRun('no-reload');
		expect(s.run?.weapon.active).toBe('pistol');
	});
});

describe('damagePlayer under glassCannon', () => {
	it('triples incoming damage', () => {
		// Glass cannon halves max HP at start (50) then triples damage.
		const state = startRun('normal', 'three-lives', 'daily-challenge', T0, 'glass-cannon');
		expect(state.run?.playerHp).toBe(50);
		expect(state.run?.maxPlayerHp).toBe(50);
		const after = damagePlayer(state, 10);
		expect(after.run?.playerHp).toBe(20); // 50 - 30
	});
});

describe('damagePlayer under ironMan', () => {
	it('skips continue-prompt — first death is final, even with lives remaining', () => {
		const state = startRun('normal', 'three-lives', 'daily-challenge', T0, 'iron-man');
		expect(state.run?.remainingLives).toBe(3);
		const dead = damagePlayer(state, 999);
		expect(dead.phase).toBe('game-over');
		// Decrement is truthful — not zeroed for cosmetic effect. End-of-run
		// summary should see "you had 2 lives left when iron-man got you."
		expect(dead.run?.remainingLives).toBe(2);
	});

	it('subsequent damagePlayer call after iron-man game-over is a no-op', () => {
		const state = startRun('normal', 'three-lives', 'daily-challenge', T0, 'iron-man');
		const dead = damagePlayer(state, 999);
		// Phase guard at top of damagePlayer (state.phase !== 'playing' returns
		// state unchanged) protects against further state mutation.
		const again = damagePlayer(dead, 999);
		expect(again).toBe(dead);
	});

	it('standard run goes to continue-prompt instead', () => {
		const state = startRun('normal', 'three-lives', 'standard', T0);
		const dead = damagePlayer(state, 999);
		expect(dead.phase).toBe('continue-prompt');
		expect(dead.run?.remainingLives).toBe(2);
	});
});

describe('recordKill under justiceOnly', () => {
	it('body kills score 0 but still increment combo + kill counters', () => {
		const state = startRun('normal', 'three-lives', 'daily-challenge', T0, 'justice-only');
		const after = recordKill(state, 'body');
		expect(after.run?.score).toBe(0);
		expect(after.run?.comboCount).toBe(1);
		expect(after.run?.enemiesKilled).toBe(1);
	});

	it('head kills score 0 under justice-only', () => {
		const state = startRun('normal', 'three-lives', 'daily-challenge', T0, 'justice-only');
		const after = recordKill(state, 'head');
		expect(after.run?.score).toBe(0);
	});

	it('justice kills still score normally', () => {
		const state = startRun('normal', 'three-lives', 'daily-challenge', T0, 'justice-only');
		const after = recordKill(state, 'justice');
		// 200 base × 1.05 (combo of 1) = 210
		expect(after.run?.score).toBeGreaterThan(0);
	});
});

describe('startRun under forcePermadeath', () => {
	it('overrides three-lives picker choice with permadeath', () => {
		const s = startRun('normal', 'three-lives', 'daily-challenge', T0, 'permadeath');
		expect(s.run?.lives).toBe('permadeath');
		expect(s.run?.remainingLives).toBe(1);
	});

	it('non-modifier run respects picker choice', () => {
		const s = startRun('normal', 'three-lives', 'standard', T0);
		expect(s.run?.lives).toBe('three-lives');
		expect(s.run?.remainingLives).toBe(3);
	});
});

describe('startRun under glassCannon', () => {
	it('halves max HP', () => {
		const s = startRun('normal', 'three-lives', 'daily-challenge', T0, 'glass-cannon');
		expect(s.run?.maxPlayerHp).toBe(50);
		expect(s.run?.playerHp).toBe(50);
	});

	it('non-modifier run uses base 100 HP', () => {
		const s = startRun('normal', 'three-lives', 'standard', T0);
		expect(s.run?.maxPlayerHp).toBe(100);
	});
});
