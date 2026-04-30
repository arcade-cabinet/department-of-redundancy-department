import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createRng } from '@/world/generator/rng';
import { buildDropTables, rollDrops } from './dropTables';

const here = dirname(fileURLToPath(import.meta.url));
const json = JSON.parse(
	readFileSync(join(here, '..', '..', 'public', 'content', 'dropTables.json'), 'utf8'),
);

describe('drop tables', () => {
	it('shipped dropTables.json validates', () => {
		const t = buildDropTables(json);
		expect(t.has('laminate-desk-block')).toBe(true);
		expect(t.has('cubicle-wall')).toBe(true);
		expect(t.has('supply-closet-wall')).toBe(true);
	});

	it('laminate-desk → 4 planks always', () => {
		const t = buildDropTables(json);
		const drops = rollDrops(t, 'laminate-desk-block', createRng('test'));
		expect(drops.length).toBe(1);
		expect(drops[0]?.slug).toBe('plank');
		expect(drops[0]?.qty).toBe(4);
	});

	it('unknown slug returns empty', () => {
		const t = buildDropTables(json);
		expect(rollDrops(t, 'nope', createRng('x'))).toEqual([]);
	});

	it('probabilistic entries roll independently', () => {
		const t = buildDropTables(json);
		// supply-closet-wall has 0.7 metal-shard + 0.3 binder-clip; over many
		// rolls both should appear.
		const counts = new Map<string, number>();
		for (let i = 0; i < 1000; i++) {
			const drops = rollDrops(t, 'supply-closet-wall', createRng(`r-${i}`));
			for (const d of drops) counts.set(d.slug, (counts.get(d.slug) ?? 0) + 1);
		}
		// Both slugs should appear at least once.
		expect(counts.get('metal-shard')).toBeGreaterThan(0);
		expect(counts.get('binder-clip')).toBeGreaterThan(0);
	});

	it('rejects malformed input', () => {
		expect(() => buildDropTables(null)).toThrow();
		expect(() => buildDropTables({})).toThrow();
		expect(() => buildDropTables({ tables: 'oops' })).toThrow();
		expect(() => buildDropTables({ tables: { x: [{ slug: '', qty: 1, prob: 1 }] } })).toThrow();
		expect(() => buildDropTables({ tables: { x: [{ slug: 'p', qty: 0, prob: 1 }] } })).toThrow();
		expect(() => buildDropTables({ tables: { x: [{ slug: 'p', qty: 1, prob: 2 }] } })).toThrow();
	});
});
