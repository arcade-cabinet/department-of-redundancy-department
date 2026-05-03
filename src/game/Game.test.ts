import { describe, expect, test, vi } from 'vitest';
import { Game } from './Game';

describe('Game subscribe + initial state', () => {
	test('starts in insert-coin phase with no run', () => {
		const game = new Game();
		const state = game.getState();
		expect(state.phase).toBe('insert-coin');
		expect(state.run).toBeNull();
	});

	test('subscribe immediately fires the listener with current state', () => {
		const game = new Game();
		const listener = vi.fn();
		game.subscribe(listener);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0]?.[0].phase).toBe('insert-coin');
	});

	test('unsubscribe stops further notifications', () => {
		const game = new Game();
		const listener = vi.fn();
		const off = game.subscribe(listener);
		listener.mockClear();
		off();
		game.insertCoin(0);
		expect(listener).not.toHaveBeenCalled();
	});

	test('listeners are fired only when state actually changes', () => {
		const game = new Game();
		const listener = vi.fn();
		game.subscribe(listener);
		listener.mockClear();
		game.insertCoin(0); // legit change
		expect(listener).toHaveBeenCalledTimes(1);
		// returnToTitle while phase is already 'playing' goes to insert-coin
		game.returnToTitle();
		expect(listener.mock.calls.at(-1)?.[0].phase).toBe('insert-coin');
	});
});

describe('Game.insertCoin', () => {
	test('flips phase to playing and creates a run', () => {
		const game = new Game();
		game.insertCoin(1000);
		const state = game.getState();
		expect(state.phase).toBe('playing');
		expect(state.run).not.toBeNull();
	});
});

describe('Game.tryFire', () => {
	test('returns false when not in a run (misfire)', () => {
		const game = new Game();
		expect(game.tryFire(0)).toBe(false);
	});

	test('returns true on a normal shot during a run', () => {
		const game = new Game();
		game.insertCoin(0);
		expect(game.tryFire(100)).toBe(true);
	});
});

describe('Game.reload + swapWeapon return-bool API', () => {
	test('reload returns false when nothing changed (full mag at start)', () => {
		const game = new Game();
		game.insertCoin(0);
		// Fresh run starts with full mag → reload is a no-op.
		expect(game.reload(100)).toBe(false);
	});

	test('reload returns true after firing depleted some ammo', () => {
		const game = new Game();
		game.insertCoin(0);
		// Fire many times to ensure mag is below max.
		for (let i = 0; i < 5; i++) game.tryFire(100 + i);
		expect(game.reload(200)).toBe(true);
	});

	test('swapWeapon returns false outside a run (no-op)', () => {
		const game = new Game();
		// Phase is insert-coin, no run in flight — nothing to swap.
		expect(game.swapWeapon()).toBe(false);
	});

	test('swapWeapon returns true during play and toggles active weapon', () => {
		const game = new Game();
		game.insertCoin(0);
		const before = game.getState().run?.weapon.active;
		expect(game.swapWeapon()).toBe(true);
		const after = game.getState().run?.weapon.active;
		expect(after).not.toBe(before);
	});
});

describe('Game phase transitions', () => {
	test('endRun(true) sends to game-over', () => {
		const game = new Game();
		game.insertCoin(0);
		game.endRun(true);
		expect(game.getState().phase).toBe('game-over');
	});

	test('endRun(false) sends to victory', () => {
		const game = new Game();
		game.insertCoin(0);
		game.endRun(false);
		expect(game.getState().phase).toBe('victory');
	});

	test('openSettings/closeSettings round-trip stays at insert-coin without run', () => {
		const game = new Game();
		game.openSettings();
		expect(game.getState().phase).toBe('settings');
		game.closeSettings();
		expect(game.getState().phase).toBe('insert-coin');
	});

	test('openSettings/closeSettings during a run returns to playing', () => {
		const game = new Game();
		game.insertCoin(0);
		game.openSettings();
		expect(game.getState().phase).toBe('settings');
		game.closeSettings();
		expect(game.getState().phase).toBe('playing');
	});

	test('openHighScores/closeHighScores round-trip', () => {
		const game = new Game();
		game.openHighScores();
		expect(game.getState().phase).toBe('high-scores');
		game.closeHighScores();
		expect(game.getState().phase).toBe('insert-coin');
	});

	test('openCabinetStats/closeCabinetStats round-trip', () => {
		const game = new Game();
		game.openCabinetStats();
		expect(game.getState().phase).toBe('cabinet-stats');
		game.closeCabinetStats();
		expect(game.getState().phase).toBe('insert-coin');
	});
});
