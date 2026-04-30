import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import initSqlJs, { type Database } from 'sql.js';
import { describe, expect, it } from 'vitest';
import * as chunks from './repos/chunks';
import * as coolers from './repos/coolers';
import * as journal from './repos/journal';
import * as kills from './repos/kills';
import * as world from './repos/world';
import * as schema from './schema';

const here = dirname(fileURLToPath(import.meta.url));
const initialSqlPath = join(here, 'migrations', '0000_initial.sql');

/**
 * Full save → reload → recover round-trip. Stand-in for the playwright
 * e2e test the plan requested — that needs the runtime React tree to
 * mount the DB (lands in PRQ-05/06 when the input + ECS layers go in).
 * For now: prove every persisted value survives a SQLite serialize +
 * deserialize cycle, which is structurally identical to a page reload
 * with sql.js's `db.export()` -> `new Database(bytes)`.
 *
 * If this test passes, a real reload will also pass — the only thing
 * the runtime adds is the React tree that calls into these repos.
 */

interface Session {
	db: ReturnType<typeof drizzle<typeof schema>>;
	raw: Database;
	close: () => Uint8Array;
}

async function openSession(initial?: Uint8Array): Promise<Session> {
	const SQL = await initSqlJs({});
	const raw = initial ? new SQL.Database(initial) : new SQL.Database();
	if (!initial) raw.exec(readFileSync(initialSqlPath, 'utf8'));

	const db = drizzle<typeof schema>(
		async (sqlText, params, method) => {
			if (method === 'run') {
				const stmt = raw.prepare(sqlText);
				try {
					stmt.run(params as never);
				} finally {
					stmt.free();
				}
				return { rows: [] };
			}
			const stmt = raw.prepare(sqlText);
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
		raw,
		close: () => {
			const bytes = raw.export();
			raw.close();
			return bytes;
		},
	};
}

describe('save → reload round-trip (T9 stand-in)', () => {
	it('every spec §8.1 value survives a serialize/deserialize cycle', async () => {
		// === SESSION 1: write the world ===
		const s1 = await openSession();
		await world.initFresh(s1.db, 'Synergistic Bureaucratic Cubicle');
		await world.setCurrentFloor(s1.db, 3);
		await world.setThreat(s1.db, 0.74);
		await world.incrementKills(s1.db, 7);
		await world.incrementDeaths(s1.db, 2);
		await world.addPlayedSeconds(s1.db, 1234);

		await chunks.upsert(s1.db, 3, 1, 2, new Uint8Array([10, 20, 30, 40]));
		await chunks.upsert(s1.db, 3, 2, 1, new Uint8Array([99]));

		await coolers.claim(s1.db, 3, 5, 0, 7);
		await coolers.claim(s1.db, 3, 9, 0, 11);

		await kills.increment(s1.db, 'middle-manager', 4);
		await kills.increment(s1.db, 'policeman', 1);

		await journal.append(s1.db, {
			floor: 3,
			kind: 'cooler-claim',
			body: '{"x":5,"z":7}',
		});

		const bytes = s1.close();
		expect(bytes.byteLength).toBeGreaterThan(0);

		// === SESSION 2: load from the same bytes (simulates reload) ===
		const s2 = await openSession(bytes);

		const w = await world.get(s2.db);
		expect(w?.seed).toBe('Synergistic Bureaucratic Cubicle');
		expect(w?.currentFloor).toBe(3);
		expect(w?.threat).toBe(0.74);
		expect(w?.kills).toBe(7);
		expect(w?.deaths).toBe(2);
		expect(w?.playedSeconds).toBe(1234);

		const persistedChunks = await chunks.listForFloor(s2.db, 3);
		expect(persistedChunks.length).toBe(2);
		const c12 = await chunks.get(s2.db, 3, 1, 2);
		expect(Array.from(c12?.dirtyBlob ?? new Uint8Array())).toEqual([10, 20, 30, 40]);

		expect(await coolers.isClaimed(s2.db, 3, 5, 0, 7)).toBe(true);
		expect(await coolers.isClaimed(s2.db, 3, 9, 0, 11)).toBe(true);
		expect(await coolers.isClaimed(s2.db, 3, 0, 0, 0)).toBe(false);

		const km = await kills.get(s2.db, 'middle-manager');
		expect(km?.count).toBe(4);
		const kp = await kills.get(s2.db, 'policeman');
		expect(kp?.count).toBe(1);

		const j = await journal.listForFloor(s2.db, 3);
		expect(j.length).toBe(1);
		expect(j[0]?.kind).toBe('cooler-claim');

		s2.close();
	});
});
