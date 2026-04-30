import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeTestDb } from './_testdb';
import * as chunks from './chunks';
import * as coolers from './coolers';
import * as inventory from './inventory';
import * as journal from './journal';
import * as kills from './kills';
import * as recipes from './recipes';
import * as structures from './structures';
import type { Db } from './types';
import * as weapons from './weapons';
import * as world from './world';

let db: Db;
let close: () => void;

beforeEach(async () => {
	const t = await makeTestDb();
	db = t.db;
	close = t.close;
});

afterEach(() => close());

describe('world repo', () => {
	it('initFresh + get round-trip', async () => {
		expect(await world.get(db)).toBeNull();
		await world.initFresh(db, 'seed-XYZ');
		const w = await world.get(db);
		expect(w?.seed).toBe('seed-XYZ');
		expect(w?.currentFloor).toBe(1);
		expect(w?.threat).toBe(0);
	});

	it('setThreat / setCurrentFloor / increments compose', async () => {
		await world.initFresh(db, 's');
		await world.setThreat(db, 0.42);
		await world.setCurrentFloor(db, 5);
		await world.incrementKills(db, 3);
		await world.incrementDeaths(db);
		await world.addPlayedSeconds(db, 120);
		const w = await world.get(db);
		expect(w?.threat).toBe(0.42);
		expect(w?.currentFloor).toBe(5);
		expect(w?.kills).toBe(3);
		expect(w?.deaths).toBe(1);
		expect(w?.playedSeconds).toBe(120);
	});
});

describe('chunks repo', () => {
	it('upsert + listForFloor + clearFloor', async () => {
		const blob = new Uint8Array([1, 2, 3, 4]);
		await chunks.upsert(db, 1, 0, 0, blob);
		await chunks.upsert(db, 1, 0, 1, blob);
		await chunks.upsert(db, 2, 0, 0, blob);
		expect((await chunks.listForFloor(db, 1)).length).toBe(2);
		expect((await chunks.listForFloor(db, 2)).length).toBe(1);
		await chunks.clearFloor(db, 1);
		expect((await chunks.listForFloor(db, 1)).length).toBe(0);
	});

	it('upsert replays write the same blob', async () => {
		await chunks.upsert(db, 1, 0, 0, new Uint8Array([1]));
		await chunks.upsert(db, 1, 0, 0, new Uint8Array([2]));
		const row = await chunks.get(db, 1, 0, 0);
		expect(row?.dirtyBlob.byteLength).toBe(1);
	});
});

describe('placed_structures repo', () => {
	it('place + listForFloor + damage destroys at hp<=0', async () => {
		const id = await structures.place(db, {
			floor: 1,
			slug: 'placed-stair-block',
			x: 0,
			y: 0,
			z: 0,
			hp: 10,
		});
		expect(id).toBeGreaterThan(0);
		expect((await structures.listForFloor(db, 1)).length).toBe(1);
		const r1 = await structures.damage(db, id, 5);
		expect(r1.destroyed).toBe(false);
		const r2 = await structures.damage(db, id, 5);
		expect(r2.destroyed).toBe(true);
		expect((await structures.listForFloor(db, 1)).length).toBe(0);
	});
});

describe('coolers repo', () => {
	it('claim + isClaimed + listForFloor', async () => {
		expect(await coolers.isClaimed(db, 1, 0, 0, 0)).toBe(false);
		await coolers.claim(db, 1, 0, 0, 0);
		await coolers.claim(db, 1, 1, 0, 0);
		await coolers.claim(db, 2, 0, 0, 0);
		expect(await coolers.isClaimed(db, 1, 0, 0, 0)).toBe(true);
		expect((await coolers.listForFloor(db, 1)).length).toBe(2);
	});

	it('claim is idempotent (replay doesnt error)', async () => {
		await coolers.claim(db, 1, 0, 0, 0);
		await coolers.claim(db, 1, 0, 0, 0);
		expect((await coolers.listForFloor(db, 1)).length).toBe(1);
	});
});

describe('inventory repo', () => {
	it('setSlot / clearSlot / consume', async () => {
		await inventory.setSlot(db, 0, 'staple-cannon', 1);
		await inventory.setSlot(db, 1, 'paperclip', 50);
		expect((await inventory.list(db)).length).toBe(2);
		expect(await inventory.consume(db, 1, 30)).toBe(20);
		expect(await inventory.consume(db, 1, 100)).toBe(0);
		expect(await inventory.consume(db, 1)).toBe(-1);
	});

	it('add stacks same slug; rejects different slug', async () => {
		await inventory.setSlot(db, 0, 'paperclip', 5);
		expect(await inventory.add(db, 0, 'paperclip', 3)).toBe(true);
		expect((await inventory.list(db))[0]?.qty).toBe(8);
		expect(await inventory.add(db, 0, 'staple', 1)).toBe(false);
	});
});

describe('weapons repo', () => {
	it('unlock is idempotent + setAmmo updates', async () => {
		await weapons.unlock(db, 'staple-cannon', 12);
		await weapons.unlock(db, 'staple-cannon', 999); // no-op (idempotent)
		expect(await weapons.isUnlocked(db, 'staple-cannon')).toBe(true);
		expect(await weapons.isUnlocked(db, 'rocket')).toBe(false);
		await weapons.setAmmo(db, 'staple-cannon', 5);
		const list = await weapons.list(db);
		expect(list[0]?.ammo).toBe(5);
	});
});

describe('journal repo', () => {
	it('append + listForFloor + listAll', async () => {
		await journal.append(db, { floor: 1, kind: 'kill', body: '{"slug":"middle-manager"}' });
		await journal.append(db, { floor: 1, kind: 'death', body: '{}' });
		await journal.append(db, { floor: 2, kind: 'kill', body: '{}' });
		const f1 = await journal.listForFloor(db, 1);
		expect(f1.length).toBe(2);
		const all = await journal.listAll(db);
		expect(all.length).toBe(3);
	});
});

describe('recipes repo', () => {
	it('discover + isKnown + list', async () => {
		await recipes.discover(db, 'staple-cannon');
		await recipes.discover(db, 'staple-cannon'); // idempotent
		expect(await recipes.isKnown(db, 'staple-cannon')).toBe(true);
		expect(await recipes.isKnown(db, 'unknown')).toBe(false);
		expect((await recipes.list(db)).length).toBe(1);
	});
});

describe('kills repo', () => {
	it('increment creates + accumulates', async () => {
		await kills.increment(db, 'middle-manager');
		await kills.increment(db, 'middle-manager', 4);
		const row = await kills.get(db, 'middle-manager');
		expect(row?.count).toBe(5);
	});
});
