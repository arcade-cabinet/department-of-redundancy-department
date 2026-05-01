import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory shim of @capacitor/preferences for node tests. Mirrors the
// real Preferences API surface that quarters.ts uses (get/set/remove).
const memory = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: vi.fn(async ({ key }: { key: string }) => ({
			value: memory.has(key) ? (memory.get(key) ?? null) : null,
		})),
		set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
			memory.set(key, value);
		}),
		remove: vi.fn(async ({ key }: { key: string }) => {
			memory.delete(key);
		}),
	},
}));

import {
	__resetQuartersForTests,
	awardQuarters,
	FRESH_INSTALL_BALANCE,
	FRIEND_BAILOUT_GRANT,
	getBalance,
	grantFriendBailout,
	initQuarters,
	rollBossDrop,
	spendQuarter,
	subscribe,
} from './quarters';

beforeEach(async () => {
	memory.clear();
	await __resetQuartersForTests();
});

describe('initQuarters', () => {
	it('seeds fresh-install balance on first read', async () => {
		const balance = await initQuarters();
		expect(balance).toBe(FRESH_INSTALL_BALANCE);
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE);
	});

	it('round-trips an existing balance', async () => {
		await initQuarters();
		await awardQuarters(3);
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE + 3);
		// Simulate a fresh boot: clear cache, keep persisted value.
		memory.set('dord.economy:balance:v1', String(FRESH_INSTALL_BALANCE + 3));
		await __resetQuartersForTests();
		memory.set('dord.economy:balance:v1', String(FRESH_INSTALL_BALANCE + 3));
		await initQuarters();
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE + 3);
	});

	it('rejects corrupted values and falls back to defaults', async () => {
		memory.set('dord.economy:balance:v1', 'not-a-number');
		await initQuarters();
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE);
	});

	it('rejects negative persisted balances and falls back to default', async () => {
		memory.set('dord.economy:balance:v1', '-5');
		await initQuarters();
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE);
	});
});

describe('awardQuarters', () => {
	it('adds to the balance', async () => {
		await initQuarters();
		await awardQuarters(2);
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE + 2);
	});

	it('ignores non-positive awards', async () => {
		await initQuarters();
		await awardQuarters(0);
		await awardQuarters(-5);
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE);
	});

	it('serializes concurrent awards — no lost-write races', async () => {
		await initQuarters();
		// Five fire-and-forget awards in the same microtask tick. With
		// serialization they sum cleanly; without, two could read the same
		// cached snapshot and one increment is lost.
		await Promise.all([
			awardQuarters(1),
			awardQuarters(1),
			awardQuarters(1),
			awardQuarters(1),
			awardQuarters(1),
		]);
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE + 5);
	});
});

describe('spendQuarter', () => {
	it('decrements on success', async () => {
		await initQuarters();
		const ok = await spendQuarter();
		expect(ok).toBe(true);
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE - 1);
	});

	it('refuses when balance is 0', async () => {
		await initQuarters();
		for (let i = 0; i < FRESH_INSTALL_BALANCE; i++) await spendQuarter();
		expect(getBalance()).toBe(0);
		const ok = await spendQuarter();
		expect(ok).toBe(false);
		expect(getBalance()).toBe(0);
	});

	it('cannot drive the balance negative under concurrent calls', async () => {
		await initQuarters();
		// Drain to 1, then race two spends.
		for (let i = 0; i < FRESH_INSTALL_BALANCE - 1; i++) await spendQuarter();
		expect(getBalance()).toBe(1);
		const [a, b] = await Promise.all([spendQuarter(), spendQuarter()]);
		// Exactly one succeeds; balance settles at 0.
		expect([a, b].sort()).toEqual([false, true]);
		expect(getBalance()).toBe(0);
	});
});

describe('grantFriendBailout', () => {
	it('always grants FRIEND_BAILOUT_GRANT', async () => {
		await initQuarters();
		for (let i = 0; i < FRESH_INSTALL_BALANCE; i++) await spendQuarter();
		await grantFriendBailout();
		expect(getBalance()).toBe(FRIEND_BAILOUT_GRANT);
	});

	it('has no rate limit — repeated bailouts stack', async () => {
		await initQuarters();
		await grantFriendBailout();
		await grantFriendBailout();
		await grantFriendBailout();
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE + FRIEND_BAILOUT_GRANT * 3);
	});
});

describe('subscribe', () => {
	it('fires the listener with the current balance immediately and on change', async () => {
		await initQuarters();
		const seen: number[] = [];
		const unsub = subscribe((b) => seen.push(b));
		await awardQuarters(1);
		await spendQuarter();
		unsub();
		await awardQuarters(99); // should not be observed after unsubscribe
		expect(seen[0]).toBe(FRESH_INSTALL_BALANCE);
		expect(seen).toContain(FRESH_INSTALL_BALANCE + 1);
		expect(seen[seen.length - 1]).toBe(FRESH_INSTALL_BALANCE);
	});
});

describe('rollBossDrop', () => {
	it('returns min when min===max (Reaper-style fixed drop)', () => {
		expect(rollBossDrop([5, 5])).toBe(5);
	});

	it('returns a value within [min, max] inclusive', () => {
		for (let i = 0; i < 50; i++) {
			const drop = rollBossDrop([1, 2]);
			expect(drop).toBeGreaterThanOrEqual(1);
			expect(drop).toBeLessThanOrEqual(2);
		}
	});
});
