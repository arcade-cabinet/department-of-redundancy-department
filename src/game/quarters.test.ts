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
	getStats,
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
		// Simulate a fresh boot: drop the cache, re-init.
		await __resetQuartersForTests();
		// __resetQuartersForTests wipes Preferences too, so re-seed manually
		// to simulate a returning player whose balance was 11.
		memory.set('dord.economy:balance:v1', String(FRESH_INSTALL_BALANCE + 3));
		await initQuarters();
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE + 3);
	});
});

describe('awardQuarters', () => {
	it('adds to the balance and lifetimeEarned', async () => {
		await initQuarters();
		await awardQuarters(2);
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE + 2);
		expect(getStats().lifetimeEarned).toBe(2);
	});

	it('ignores non-positive awards', async () => {
		await initQuarters();
		await awardQuarters(0);
		await awardQuarters(-5);
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE);
		expect(getStats().lifetimeEarned).toBe(0);
	});
});

describe('spendQuarter', () => {
	it('decrements on success and tracks lifetimeSpent', async () => {
		await initQuarters();
		const ok = await spendQuarter();
		expect(ok).toBe(true);
		expect(getBalance()).toBe(FRESH_INSTALL_BALANCE - 1);
		expect(getStats().lifetimeSpent).toBe(1);
	});

	it('refuses when balance is 0', async () => {
		await initQuarters();
		// Drain the wallet.
		for (let i = 0; i < FRESH_INSTALL_BALANCE; i++) await spendQuarter();
		expect(getBalance()).toBe(0);
		const ok = await spendQuarter();
		expect(ok).toBe(false);
		expect(getBalance()).toBe(0);
		expect(getStats().lifetimeSpent).toBe(FRESH_INSTALL_BALANCE);
	});
});

describe('grantFriendBailout', () => {
	it('always grants FRIEND_BAILOUT_GRANT and bumps the bailout counter', async () => {
		await initQuarters();
		// Drain first to simulate the realistic call site.
		for (let i = 0; i < FRESH_INSTALL_BALANCE; i++) await spendQuarter();
		await grantFriendBailout();
		expect(getBalance()).toBe(FRIEND_BAILOUT_GRANT);
		expect(getStats().friendBailoutCount).toBe(1);
	});

	it('has no rate limit — repeated bailouts stack', async () => {
		await initQuarters();
		await grantFriendBailout();
		await grantFriendBailout();
		await grantFriendBailout();
		expect(getStats().friendBailoutCount).toBe(3);
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
		// rand() is the engine RNG facade; in node test mode it's
		// deterministic per-seed but here we don't seed, so just sample.
		for (let i = 0; i < 50; i++) {
			const drop = rollBossDrop([1, 2]);
			expect(drop).toBeGreaterThanOrEqual(1);
			expect(drop).toBeLessThanOrEqual(2);
		}
	});

	it('clamps min<=0 to 0 when max<=min', () => {
		expect(rollBossDrop([0, 0])).toBe(0);
	});
});
