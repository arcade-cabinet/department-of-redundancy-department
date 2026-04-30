import { Capacitor } from '@capacitor/core';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import type * as schema from './schema';

/**
 * Runtime adapter dispatcher. Picks the native (Capacitor SQLite)
 * adapter on iOS / Android shells, otherwise the web (sql.js + jeep
 * web component) adapter for browser/PWA. Both share the drizzle-proxy
 * interface so `repos/*` import this module's `getDb()` and never see
 * the engine difference.
 *
 * The handle is cached at the module level — first await initializes
 * the wasm + runs migrations; subsequent awaits return the same
 * promise. On failure the cache clears so a retry can succeed.
 */

export interface DB {
	/** Drizzle query API. Repos go through this. */
	db: SqliteRemoteDatabase<typeof schema>;
	close(): Promise<void> | void;
}

let cached: Promise<DB> | null = null;

export function getDb(): Promise<DB> {
	if (!cached) cached = pick();
	cached.catch(() => {
		cached = null;
	});
	return cached;
}

async function pick(): Promise<DB> {
	if (Capacitor.isNativePlatform()) {
		const mod = await import('./client.native');
		return mod.getDb();
	}
	const mod = await import('./client.web');
	return mod.getDb();
}

/** Reset the cached handle. Mostly useful for tests; production code
 *  should never need to call this. */
export function _resetForTests(): void {
	cached = null;
}
