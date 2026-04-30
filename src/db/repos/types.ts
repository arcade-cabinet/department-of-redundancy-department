import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type { SqliteRemoteDatabase, SqliteRemoteResult } from 'drizzle-orm/sqlite-proxy';
import type * as schema from '../schema';

/** The drizzle handle every repo function takes as its first argument.
 *  Identical between web (sql.js) and native (capacitor-sqlite) since
 *  both adapters use the sqlite-proxy driver.
 *
 *  Repos accept either the top-level db OR a transaction handle (both
 *  expose the same query API; only `.batch` differs and repos never
 *  call it). The save-loop wraps writers in `db.transaction(...)` for
 *  spec §8.4's "single transaction per flush" guarantee. */
export type Db =
	| SqliteRemoteDatabase<typeof schema>
	| SQLiteTransaction<
			'async',
			SqliteRemoteResult<unknown>,
			typeof schema,
			ExtractTablesWithRelations<typeof schema>
	  >;
