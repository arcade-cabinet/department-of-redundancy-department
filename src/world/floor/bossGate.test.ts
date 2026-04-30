import { describe, expect, it } from 'vitest';
import { isBossFloor, REAPER_FLOOR_INTERVAL, shouldLockUpDoor } from './bossGate';

describe('boss gate logic', () => {
	it('floor 5 is a boss floor (REAPER_FLOOR_INTERVAL=5)', () => {
		expect(REAPER_FLOOR_INTERVAL).toBe(5);
		expect(isBossFloor(5)).toBe(true);
	});

	it('every 5th floor is a boss floor', () => {
		expect(isBossFloor(10)).toBe(true);
		expect(isBossFloor(15)).toBe(true);
		expect(isBossFloor(100)).toBe(true);
	});

	it('non-multiples are not boss floors', () => {
		for (const f of [1, 2, 3, 4, 6, 7, 8, 9, 11]) {
			expect(isBossFloor(f)).toBe(false);
		}
	});

	it('floor 0 is not a boss floor (defensive)', () => {
		expect(isBossFloor(0)).toBe(false);
	});

	it('shouldLockUpDoor: true on a boss floor when boss is alive', () => {
		expect(shouldLockUpDoor({ floor: 5, bossAlive: true })).toBe(true);
	});

	it('shouldLockUpDoor: false on boss floor once boss is dead', () => {
		expect(shouldLockUpDoor({ floor: 5, bossAlive: false })).toBe(false);
	});

	it('shouldLockUpDoor: false on a non-boss floor regardless', () => {
		expect(shouldLockUpDoor({ floor: 3, bossAlive: true })).toBe(false);
		expect(shouldLockUpDoor({ floor: 3, bossAlive: false })).toBe(false);
	});
});
