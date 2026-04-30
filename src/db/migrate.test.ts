import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs, { type Database } from 'sql.js';
import { describe, expect, it } from 'vitest';
import { type MigrationEntry, type MigrationRunnerInput, runMigrations } from './migrate';

const here = dirname(fileURLToPath(import.meta.url));
const initialSqlPath = join(here, 'migrations', '0000_initial.sql');

async function makeDb(): Promise<Database> {
	const SQL = await initSqlJs({});
	return new SQL.Database();
}

function adapterFor(db: Database): MigrationRunnerInput {
	return {
		getCurrentVersion(): number | null {
			// world_meta missing on fresh DB → null. Otherwise return the
			// schema_version, treating its absence as -1 (not yet migrated).
			try {
				const rows = db.exec('SELECT schema_version FROM world_meta WHERE id = 1');
				const row = rows[0]?.values[0]?.[0];
				return typeof row === 'number' ? row - 1 : -1;
			} catch {
				return null;
			}
		},
		exec(sql: string): void {
			db.exec(sql);
		},
	};
}

function loadInitialMigration(): MigrationEntry {
	const sql = readFileSync(initialSqlPath, 'utf8');
	return { idx: 0, tag: '0000_initial', sql };
}

describe('migration runner', () => {
	it('applies the initial migration on a fresh DB', async () => {
		const db = await makeDb();
		const runner = adapterFor(db);
		const m0 = loadInitialMigration();

		const r = await runMigrations(runner, [m0]);

		expect(r.applied).toBe(1);
		expect(r.appliedTags).toEqual(['0000_initial']);
		expect(r.newVersion).toBe(1);

		// Tables exist.
		const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
		const names = tables[0]?.values.map((v) => v[0] as string) ?? [];
		expect(names).toContain('world_meta');
		expect(names).toContain('chunks');
		expect(names).toContain('claimed_water_coolers');
		expect(names).toContain('placed_structures');
		expect(names).toContain('inventory');
		expect(names).toContain('weapons_owned');
		expect(names).toContain('journal_entries');
		expect(names).toContain('recipes_known');
		expect(names).toContain('kills');

		// world_meta seeded with version=1.
		const ver = db.exec('SELECT schema_version FROM world_meta WHERE id = 1');
		expect(ver[0]?.values[0]?.[0]).toBe(1);
	});

	it('is idempotent — second run applies nothing', async () => {
		const db = await makeDb();
		const runner = adapterFor(db);
		const m0 = loadInitialMigration();

		await runMigrations(runner, [m0]);
		const r2 = await runMigrations(runner, [m0]);

		expect(r2.applied).toBe(0);
		expect(r2.appliedTags).toEqual([]);
		// Version unchanged.
		expect(r2.newVersion).toBe(1);
	});

	it('applies only newer migrations on partial-upgrade', async () => {
		const db = await makeDb();
		const runner = adapterFor(db);
		const m0 = loadInitialMigration();

		// Boot at version 1 (m0 already applied).
		await runMigrations(runner, [m0]);

		// Add a hypothetical m1 — exercise the "newer migrations" path
		// without committing a real second migration to the repo.
		const m1: MigrationEntry = {
			idx: 1,
			tag: '0001_test_only',
			sql: 'CREATE TABLE __test_table (id INTEGER PRIMARY KEY); INSERT INTO __test_table (id) VALUES (42);',
		};
		const r = await runMigrations(runner, [m0, m1]);

		expect(r.applied).toBe(1);
		expect(r.appliedTags).toEqual(['0001_test_only']);
		expect(r.newVersion).toBe(2);

		const rows = db.exec('SELECT id FROM __test_table');
		expect(rows[0]?.values[0]?.[0]).toBe(42);
	});

	it('rejects out-of-order migrations', async () => {
		const db: { exec: (s: string) => void } = { exec: () => {} };
		const runner: MigrationRunnerInput = {
			getCurrentVersion: () => null,
			exec: db.exec,
		};
		const m0: MigrationEntry = { idx: 0, tag: 'a', sql: '' };
		const m_dup: MigrationEntry = { idx: 0, tag: 'b', sql: '' };
		await expect(runMigrations(runner, [m0, m_dup])).rejects.toThrow(/out of order/i);
	});
});
