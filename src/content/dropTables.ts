import type { Rng } from '@/world/generator/rng';

/**
 * Drop tables: which items + counts a block yields when mined.
 *
 * Loaded from `public/content/dropTables.json` at runtime; hand-validated
 * (zod isn't installed yet — same pattern as weapons.ts). The runtime
 * mining handler calls `rollDrops(slug, rng)` to get the item-stack list
 * to add to inventory.
 */

export interface DropEntry {
	slug: string;
	qty: number;
	/** Probability [0,1]. 1.0 = always drops. */
	prob: number;
}

export interface DropTablesShape {
	tables: Record<string, DropEntry[]>;
}

let cache: Map<string, DropEntry[]> | null = null;
let pending: Promise<Map<string, DropEntry[]>> | null = null;

const DROPS_URL = '/content/dropTables.json';

export async function loadDropTables(url: string = DROPS_URL): Promise<Map<string, DropEntry[]>> {
	if (cache) return cache;
	if (pending) return pending;
	pending = (async () => {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`dropTables.json fetch failed: ${res.status}`);
		const json = (await res.json()) as unknown;
		cache = buildDropTables(json);
		return cache;
	})();
	pending.catch(() => {
		pending = null;
	});
	return pending;
}

export function buildDropTables(rawJson: unknown): Map<string, DropEntry[]> {
	if (!rawJson || typeof rawJson !== 'object') {
		throw new Error('dropTables: must be an object');
	}
	const root = rawJson as { tables?: unknown };
	if (!root.tables || typeof root.tables !== 'object') {
		throw new Error('dropTables: expected { tables: { ... } }');
	}
	const map = new Map<string, DropEntry[]>();
	for (const [slug, list] of Object.entries(root.tables as Record<string, unknown>)) {
		if (!Array.isArray(list)) throw new Error(`dropTables.${slug}: expected array`);
		map.set(
			slug,
			list.map((raw) => validateEntry(slug, raw)),
		);
	}
	return map;
}

export function _resetDropTablesForTests(): void {
	cache = null;
	pending = null;
}

/** Roll the drops for a mined block. Returns `[]` if the slug has no
 *  table entry (silently — minable blocks without drops just yield
 *  nothing). */
export function rollDrops(
	tables: Map<string, DropEntry[]>,
	slug: string,
	rng: Rng,
): { slug: string; qty: number }[] {
	const list = tables.get(slug);
	if (!list) return [];
	const out: { slug: string; qty: number }[] = [];
	for (const entry of list) {
		if (rng.next() < entry.prob) {
			out.push({ slug: entry.slug, qty: entry.qty });
		}
	}
	return out;
}

function validateEntry(parentSlug: string, raw: unknown): DropEntry {
	if (!raw || typeof raw !== 'object') {
		throw new Error(`dropTables.${parentSlug}: entry not an object`);
	}
	const r = raw as Record<string, unknown>;
	if (typeof r.slug !== 'string' || r.slug.length === 0) {
		throw new Error(`dropTables.${parentSlug}.slug: expected non-empty string`);
	}
	if (typeof r.qty !== 'number' || r.qty < 1 || !Number.isFinite(r.qty)) {
		throw new Error(`dropTables.${parentSlug}.qty: expected positive number`);
	}
	if (typeof r.prob !== 'number' || r.prob < 0 || r.prob > 1) {
		throw new Error(`dropTables.${parentSlug}.prob: expected number in [0, 1]`);
	}
	return { slug: r.slug, qty: r.qty, prob: r.prob };
}
