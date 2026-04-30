import {
	CapacitorSQLite,
	SQLiteConnection,
	type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { runMigrations } from './migrate';
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

	// Apply migrations through the SHARED async runner — same code path
	// as the web adapter, eliminating the schema_version stamping drift
	// that two parallel implementations would otherwise risk. Code
	// reviewer feedback on PR #10.
	await runMigrations(
		{
			getCurrentVersion: async () => {
				const res = await conn
					.query('SELECT schema_version FROM world_meta WHERE id = 1')
					.catch(() => null);
				const v = res?.values?.[0]?.schema_version;
				return typeof v === 'number' ? v - 1 : null;
			},
			exec: async (text) => {
				await conn.execute(text);
			},
		},
		MIGRATIONS,
	);

	return {
		db,
		conn,
		async close() {
			await conn.close();
			await sqlite.closeConnection(DB_NAME, false);
		},
	};
}
