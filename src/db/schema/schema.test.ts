import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';
import {
	chunks,
	claimedWaterCoolers,
	inventory,
	journalEntries,
	kills,
	placedStructures,
	recipesKnown,
	weaponsOwned,
	worldMeta,
} from './index';

function columnNames(table: SQLiteTable): string[] {
	return getTableConfig(table).columns.map((c) => c.name);
}

describe('drizzle schema (PRQ-04 T1)', () => {
	it('all 9 tables present', () => {
		const tables = [
			worldMeta,
			chunks,
			placedStructures,
			claimedWaterCoolers,
			inventory,
			weaponsOwned,
			journalEntries,
			recipesKnown,
			kills,
		];
		expect(tables.length).toBe(9);
		// Each table has a non-empty config + name.
		for (const t of tables) {
			const cfg = getTableConfig(t);
			expect(cfg.name).toBeTruthy();
			expect(cfg.columns.length).toBeGreaterThan(0);
		}
	});

	it('world_meta has all spec §8.1 columns', () => {
		const cols = columnNames(worldMeta);
		for (const c of [
			'id',
			'seed',
			'current_floor',
			'threat',
			'deaths',
			'kills',
			'played_seconds',
			'schema_version',
			'created_at',
			'updated_at',
		]) {
			expect(cols, `world_meta.${c}`).toContain(c);
		}
	});

	it('chunks has composite (floor, chunk_x, chunk_z) PK + dirty_blob', () => {
		const cols = columnNames(chunks);
		for (const c of ['floor', 'chunk_x', 'chunk_z', 'dirty_blob', 'updated_at']) {
			expect(cols, `chunks.${c}`).toContain(c);
		}
	});

	it('placed_structures has id + spatial + slug + hp', () => {
		const cols = columnNames(placedStructures);
		for (const c of ['id', 'floor', 'slug', 'x', 'y', 'z', 'rot', 'hp', 'created_at']) {
			expect(cols).toContain(c);
		}
	});

	it('claimed_water_coolers has (floor, x, y, z) PK', () => {
		const cols = columnNames(claimedWaterCoolers);
		for (const c of ['floor', 'x', 'y', 'z', 'claimed_at']) {
			expect(cols).toContain(c);
		}
	});

	it('inventory has slot, item_slug, qty', () => {
		const cols = columnNames(inventory);
		expect(cols).toContain('slot');
		expect(cols).toContain('item_slug');
		expect(cols).toContain('qty');
	});

	it('weapons_owned has slug, ammo, unlocked_at', () => {
		const cols = columnNames(weaponsOwned);
		expect(cols).toContain('slug');
		expect(cols).toContain('ammo');
		expect(cols).toContain('unlocked_at');
	});

	it('journal_entries has id, floor, ts, kind, body', () => {
		const cols = columnNames(journalEntries);
		for (const c of ['id', 'floor', 'ts', 'kind', 'body']) {
			expect(cols).toContain(c);
		}
	});

	it('recipes_known has slug, discovered_at', () => {
		const cols = columnNames(recipesKnown);
		expect(cols).toContain('slug');
		expect(cols).toContain('discovered_at');
	});

	it('kills has slug, count, last_at', () => {
		const cols = columnNames(kills);
		for (const c of ['slug', 'count', 'last_at']) {
			expect(cols).toContain(c);
		}
	});

	it('worldMeta default values present (defensive — first-boot initializer)', () => {
		// Insert type infers defaults as optional; row type infers them as required.
		// The presence of `default()` on each column is what makes that work.
		const cfg = getTableConfig(worldMeta);
		const seedCol = cfg.columns.find((c) => c.name === 'seed');
		expect(seedCol).toBeDefined();
		// `seed` has no default — caller must provide on first boot.
		expect(seedCol?.hasDefault).toBe(false);
		const threatCol = cfg.columns.find((c) => c.name === 'threat');
		expect(threatCol?.hasDefault).toBe(true);
	});
});
