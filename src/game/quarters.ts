import { Preferences } from '@capacitor/preferences';
import { rand } from '../engine/rng';

/**
 * Quarter economy — the only persistent player-facing currency in DORD.
 *
 * Per docs/spec/06-economy.md:
 *  - Fresh install seeds 8 quarters ($2.00).
 *  - INSERT COIN is always free — quarters are spent only on continues.
 *  - Bosses drop quarters on phase clear (minis 1–2, Reaper 5).
 *  - Balance reaches 0 + player taps INSERT COIN → friend modal grants +8.
 *
 * This module owns the `dord.economy` Preferences namespace and is the
 * only file in the repo that reads or writes those keys.
 */

const NAMESPACE = 'dord.economy';
const KEYS = {
	balance: `${NAMESPACE}:balance:v1`,
	lifetimeEarned: `${NAMESPACE}:lifetimeEarned:v1`,
	lifetimeSpent: `${NAMESPACE}:lifetimeSpent:v1`,
	friendBailoutCount: `${NAMESPACE}:friendBailoutCount:v1`,
} as const;

export const FRESH_INSTALL_BALANCE = 8;
export const FRIEND_BAILOUT_GRANT = 8;

type Listener = (balance: number) => void;

interface QuartersStats {
	readonly balance: number;
	readonly lifetimeEarned: number;
	readonly lifetimeSpent: number;
	readonly friendBailoutCount: number;
}

let cached: QuartersStats | null = null;
const listeners = new Set<Listener>();
// Mutation queue. Every write goes through `enqueue()` so a fire-and-forget
// awardQuarters from a boss kill cannot interleave with a spendQuarter
// triggered by the continue prompt — read-modify-write becomes serial.
let writeChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
	const next = writeChain.then(fn, fn);
	writeChain = next.catch(() => undefined);
	return next;
}

async function readNumber(key: string, fallback: number): Promise<number> {
	const { value } = await Preferences.get({ key });
	if (value === null) return fallback;
	// Defense in depth: parseInt rejects "1e3" / "0x10" / "1.5" / " 8 " edge
	// shapes that Number() would happily coerce. Negative or non-finite
	// stored values fall back to `fallback` rather than poisoning state.
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 0) return fallback;
	return parsed;
}

async function writeNumber(key: string, value: number): Promise<void> {
	await Preferences.set({ key, value: String(value) });
}

async function ensureLoaded(): Promise<QuartersStats> {
	if (cached) return cached;
	// First-ever read seeds the balance at FRESH_INSTALL_BALANCE. Subsequent
	// reads round-trip whatever the player has earned/spent.
	const existing = await Preferences.get({ key: KEYS.balance });
	if (existing.value === null) {
		await writeNumber(KEYS.balance, FRESH_INSTALL_BALANCE);
	}
	const [balance, lifetimeEarned, lifetimeSpent, friendBailoutCount] = await Promise.all([
		readNumber(KEYS.balance, FRESH_INSTALL_BALANCE),
		readNumber(KEYS.lifetimeEarned, 0),
		readNumber(KEYS.lifetimeSpent, 0),
		readNumber(KEYS.friendBailoutCount, 0),
	]);
	cached = { balance, lifetimeEarned, lifetimeSpent, friendBailoutCount };
	return cached;
}

async function update(next: QuartersStats): Promise<void> {
	// Belt + suspenders: never persist a negative balance even if a caller
	// computed one through arithmetic on a corrupted prior value.
	const safe: QuartersStats = {
		balance: Math.max(0, next.balance),
		lifetimeEarned: Math.max(0, next.lifetimeEarned),
		lifetimeSpent: Math.max(0, next.lifetimeSpent),
		friendBailoutCount: Math.max(0, next.friendBailoutCount),
	};
	cached = safe;
	await Promise.all([
		writeNumber(KEYS.balance, safe.balance),
		writeNumber(KEYS.lifetimeEarned, safe.lifetimeEarned),
		writeNumber(KEYS.lifetimeSpent, safe.lifetimeSpent),
		writeNumber(KEYS.friendBailoutCount, safe.friendBailoutCount),
	]);
	for (const listener of listeners) listener(safe.balance);
}

/** Initialize the cache from Preferences. Must be awaited once at boot. */
export async function initQuarters(): Promise<number> {
	const stats = await ensureLoaded();
	return stats.balance;
}

/** Synchronous read of the cached balance. Returns 0 before initQuarters resolves. */
export function getBalance(): number {
	return cached?.balance ?? 0;
}

export function subscribe(listener: Listener): () => void {
	listeners.add(listener);
	listener(getBalance());
	return () => {
		listeners.delete(listener);
	};
}

/** Award quarters from a boss kill. Persists immediately. */
export function awardQuarters(n: number): Promise<void> {
	if (n <= 0) return Promise.resolve();
	return enqueue(async () => {
		const stats = await ensureLoaded();
		await update({
			...stats,
			balance: stats.balance + n,
			lifetimeEarned: stats.lifetimeEarned + n,
		});
	});
}

/**
 * Spend 1 quarter on a continue. Returns true on success, false if the
 * balance is 0 (caller should suppress the continue prompt or trigger
 * the friend modal as appropriate).
 */
export function spendQuarter(): Promise<boolean> {
	return enqueue(async () => {
		const stats = await ensureLoaded();
		if (stats.balance <= 0) return false;
		await update({
			...stats,
			balance: stats.balance - 1,
			lifetimeSpent: stats.lifetimeSpent + 1,
		});
		return true;
	});
}

/** Friend modal grant — +FRIEND_BAILOUT_GRANT quarters, no rate limit. */
export function grantFriendBailout(): Promise<void> {
	return enqueue(async () => {
		const stats = await ensureLoaded();
		await update({
			...stats,
			balance: stats.balance + FRIEND_BAILOUT_GRANT,
			friendBailoutCount: stats.friendBailoutCount + 1,
		});
	});
}

/**
 * Resolve a boss's quarter drop range to a concrete payout. Uses the
 * engine `rand()` facade so behavior is deterministic under `?seed=N`.
 * Both bounds must be non-negative integers with `min <= max`.
 */
export function rollBossDrop(range: readonly [number, number]): number {
	const [min, max] = range;
	if (max < min) {
		throw new Error(`rollBossDrop: invalid range [${min}, ${max}] (max < min)`);
	}
	if (max === min) return min;
	const span = max - min + 1;
	return Math.floor(min + rand() * span);
}

/** Test-only: clear in-memory cache + Preferences keys. */
export async function __resetQuartersForTests(): Promise<void> {
	cached = null;
	listeners.clear();
	await Promise.all([
		Preferences.remove({ key: KEYS.balance }),
		Preferences.remove({ key: KEYS.lifetimeEarned }),
		Preferences.remove({ key: KEYS.lifetimeSpent }),
		Preferences.remove({ key: KEYS.friendBailoutCount }),
	]);
}
