import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import type * as schema from '../schema';

/** The drizzle handle every repo function takes as its first argument.
 *  Identical between web (sql.js) and native (capacitor-sqlite) since
 *  both adapters use the sqlite-proxy driver. */
export type Db = SqliteRemoteDatabase<typeof schema>;
