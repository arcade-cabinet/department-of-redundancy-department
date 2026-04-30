import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import type { Database } from 'sql.js';
import { runMigrations } from './migrate';
import { MIGRATIONS } from './migrations/_index';
import * as schema from './schema';

// sql.js 1.14 ships UMD; Vite's dep optimizer doesn't synthesize a real
// `default` export from `module.exports.default = initSqlJs`, so a static
// `import initSqlJs from 'sql.js'` throws at runtime. Resolve via dynamic
// import inside init() and read whichever shape the loader actually
// produced (default function OR `Module` named export OR the module
// namespace itself acting callable).
// biome-ignore lint/suspicious/noExplicitAny: cross-shape resolver
type InitSqlJsFn = (cfg: { locateFile?: (file: string) => string }) => Promise<any>;

async function loadInitSqlJs(): Promise<InitSqlJsFn> {
	const mod = (await import('sql.js')) as unknown as Record<string, unknown>;
	// Vite's CJS interop can wrap UMD as { default: fn }, { default: { default: fn } },
	// or { Module: fn } depending on the entry. Probe each layer for a callable.
	const candidates: unknown[] = [
		mod,
		mod.default,
		(mod.default as Record<string, unknown> | undefined)?.default,
		mod.Module,
		(mod.default as Record<string, unknown> | undefined)?.Module,
	];
	for (const c of candidates) {
		if (typeof c === 'function') return c as InitSqlJsFn;
	}
	throw new Error('sql.js: no callable initializer found on imported module');
}

/**
 * Web adapter: sql.js for the SQLite engine, drizzle's sqlite-proxy
 * driver to wrap it. The wasm binary is served from `/wasm/sql-wasm.wasm`
 * (copied at build time by `scripts/copy-wasm.mjs`).
 *
 * jeep-sqlite is the web-component shim that mirrors the
 * `@capacitor-community/sqlite` API for the web shell. We register it
 * lazily once at module load. Once PRQ-16 wires the mobile shell,
 * native devices use the real Capacitor plugin instead.
 */

let dbPromise: Promise<DBHandle> | null = null;

export interface DBHandle {
	db: SqliteRemoteDatabase<typeof schema>;
	sql: Database;
	close(): void;
}

export function getDb(): Promise<DBHandle> {
	if (!dbPromise) dbPromise = init();
	dbPromise.catch(() => {
		// Drop the cached promise on failure so a retry can succeed
		// (e.g. if the wasm fetch transiently failed on a slow connection).
		dbPromise = null;
	});
	return dbPromise;
}

async function init(): Promise<DBHandle> {
	const initSqlJs = await loadInitSqlJs();
	const SQL = await initSqlJs({
		locateFile: (file) => `${window.location.origin}/wasm/${file}`,
	});
	const sql = new SQL.Database();

	// Wire drizzle's proxy callbacks → sql.js. The proxy's contract is:
	//   (sqlText, params, method) -> { rows: unknown[][] }
	// for select/all/get; void for run. sql.js exec returns an array of
	// SqlValue[][] grouped by statement; for parameterized queries we
	// use prepare()/getAsObject() pattern.
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

	// Apply migrations. The shared runner reads world_meta.schema_version
	// (or detects a fresh DB), then replays anything new in order. Same
	// runner the native adapter uses — single source of truth for the
	// schema_version stamping pattern.
	await runMigrations(
		{
			getCurrentVersion: () => {
				try {
					const r = sql.exec('SELECT schema_version FROM world_meta WHERE id = 1');
					const v = r[0]?.values[0]?.[0];
					return typeof v === 'number' ? v - 1 : -1;
				} catch {
					return null;
				}
			},
			exec: (text) => {
				sql.exec(text);
			},
		},
		MIGRATIONS,
	);

	return {
		db,
		sql,
		close() {
			sql.close();
		},
	};
}
