import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import initSqlJs, { type Database } from 'sql.js';
import * as schema from '../schema';
import type { Db } from './types';

/** The unwidened drizzle handle. Repos accept the wider `Db` (which
 *  includes transaction handles); tests that need the actual handle
 *  to call `.transaction()` use this concrete type. */
export type RootDb = SqliteRemoteDatabase<typeof schema>;

const here = dirname(fileURLToPath(import.meta.url));
const initialSqlPath = join(here, '..', 'migrations', '0000_initial.sql');

/**
 * Spin up an in-memory sql.js DB with the initial migration applied,
 * wrapped in a drizzle-proxy handle. Repo tests use this to exercise
 * the same code path the runtime adapters take, without booting
 * sql.js's wasm fetcher or the Capacitor stack.
 */
export async function makeTestDb(): Promise<{
	db: Db;
	rootDb: RootDb;
	raw: Database;
	close: () => void;
}> {
	const SQL = await initSqlJs({});
	const sql = new SQL.Database();
	sql.exec(readFileSync(initialSqlPath, 'utf8'));

	const db = drizzle<typeof schema>(
		async (sqlText, params, method) => {
			if (method === 'run') {
				const stmt = sql.prepare(sqlText);
				try {
					stmt.run(params as never);
				} finally {
					stmt.free();
				}
				return { rows: [] };
			}
			const stmt = sql.prepare(sqlText);
			const rows: unknown[][] = [];
			try {
				stmt.bind(params as never);
				while (stmt.step()) rows.push(stmt.get() as unknown[]);
			} finally {
				stmt.free();
			}
			if (method === 'get') return { rows: rows[0] ? [rows[0]] : [] };
			return { rows };
		},
		{ schema, casing: 'snake_case' },
	);

	return {
		db,
		rootDb: db,
		raw: sql,
		close: () => sql.close(),
	};
}
