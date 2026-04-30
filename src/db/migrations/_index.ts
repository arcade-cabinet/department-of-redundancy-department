/**
 * Pre-imported migration SQL strings, ordered by idx. Each entry's idx
 * matches the journal at meta/_journal.json. The migrations runner
 * applies any with idx > current world_meta.schema_version.
 *
 * Why ?raw imports instead of fs reads: bundlers (Vite for web,
 * Capacitor's webpack for native shell) need the SQL text inlined
 * into the bundle — otherwise the runtime fetch path would fail on
 * native and the .sql files never make it into the iOS/Android assets.
 *
 * When `pnpm drizzle:gen` produces a new migration, append the entry
 * here in idx order. The schema.test.ts asserts ordering at test time.
 */
import initial from './0000_initial.sql?raw';
import type { MigrationEntry } from '../migrate';

export const MIGRATIONS: readonly MigrationEntry[] = [
	{ idx: 0, tag: '0000_initial', sql: initial },
];
