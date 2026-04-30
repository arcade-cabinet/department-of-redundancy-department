import {
	CapacitorSQLite,
	SQLiteConnection,
	type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { MIGRATIONS } from './migrations/_index';
import * as schema from './schema';

/**
 * Native adapter (iOS / Android via Capacitor 8). Full validation is
 * deferred to PRQ-16 (mobile shell) — for now this module imports
 * cleanly under node/test and wires the same drizzle-proxy contract
 * the web adapter uses.
 *
 * Why drizzle-proxy: same query interface as the web adapter, so
 * repos in src/db/repos/* can be authored once. The plugin is the
 * official Capacitor SQLite community package.
 */

const DB_NAME = 'dord';
const DB_VERSION = 1;

export interface DBHandle {
	db: SqliteRemoteDatabase<typeof schema>;
	conn: SQLiteDBConnection;
	close(): Promise<void>;
}

let dbPromise: Promise<DBHandle> | null = null;

export function getDb(): Promise<DBHandle> {
	if (!dbPromise) dbPromise = init();
	dbPromise.catch(() => {
		dbPromise = null;
	});
	return dbPromise;
}

async function init(): Promise<DBHandle> {
	const sqlite = new SQLiteConnection(CapacitorSQLite);
	// The fourth arg `false` is `readonly` per the v8 API; the fifth arg
	// `'no-encryption'` is the encryption mode (we don't ship at-rest
	// encryption in alpha; revisit in beta if a privacy threat model
	// warrants it).
	const conn = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
	await conn.open();

	const db = drizzle<typeof schema>(
		async (sqlText, params, method) => {
			if (method === 'run') {
				await conn.run(sqlText, params as never);
				return { rows: [] };
			}
			const result = await conn.query(sqlText, params as never);
			const rows = (result.values ?? []).map((row) => Object.values(row) as unknown[]);
			if (method === 'get') return { rows: rows[0] ? [rows[0]] : [] };
			return { rows };
		},
		{ schema, casing: 'snake_case' },
	);

	// Migration runner. Capacitor SQLite's connection API is async, so
	// we adapt the runner's sync exec via a top-level await pattern:
	// pull schema_version synchronously from a cached query result, then
	// run migrations one at a time. Acceptable on first-boot only.
	const versionRes = await conn
		.query('SELECT schema_version FROM world_meta WHERE id = 1')
		.catch(() => null);
	const currentVersion =
		versionRes?.values?.[0]?.schema_version != null
			? Number(versionRes.values[0].schema_version) - 1
			: null;

	for (const m of MIGRATIONS) {
		if (currentVersion !== null && m.idx <= currentVersion) continue;
		await conn.execute(m.sql);
	}
	if (MIGRATIONS.length > 0) {
		const latest = MIGRATIONS.at(-1);
		if (latest) {
			await conn.run("INSERT OR IGNORE INTO world_meta (id, seed) VALUES (1, '');", []);
			await conn.run(
				`UPDATE world_meta SET schema_version = ?, updated_at = (unixepoch() * 1000) WHERE id = 1`,
				[latest.idx + 1],
			);
		}
	}

	return {
		db,
		conn,
		async close() {
			await conn.close();
			await sqlite.closeConnection(DB_NAME, false);
		},
	};
}
