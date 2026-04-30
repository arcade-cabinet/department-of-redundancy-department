import { describe, expect, it } from 'vitest';
import type { SurfaceKind } from '@/input/surfaceKind';
import { optionsFor } from './options';

describe('radial options', () => {
	it('every SurfaceKind has at least 3 options + a Cancel', () => {
		const kinds: SurfaceKind[] = [
			'floor',
			'wall-world',
			'wall-placed',
			'desk',
			'terminal',
			'printer',
			'door',
			'enemy',
		];
		for (const k of kinds) {
			const opts = optionsFor(k);
			expect(opts.length, `${k} has ≥3 options`).toBeGreaterThanOrEqual(3);
			expect(opts.length, `${k} has ≤5 options (radial slots)`).toBeLessThanOrEqual(5);
			expect(
				opts.find((o) => o.id === 'cancel'),
				`${k} has cancel`,
			).toBeDefined();
		}
	});

	it('null surface returns empty list (host should not open)', () => {
		expect(optionsFor(null)).toEqual([]);
	});

	it('floor → 5 placement options', () => {
		const ids = optionsFor('floor').map((o) => o.id);
		expect(ids).toContain('place-stair');
		expect(ids).toContain('place-wall');
		expect(ids).toContain('place-desk');
		expect(ids).toContain('place-terminal');
	});

	it('wall-placed has both mine + repair (placed structures repairable)', () => {
		const ids = optionsFor('wall-placed').map((o) => o.id);
		expect(ids).toContain('mine');
		expect(ids).toContain('repair');
	});

	it('enemy has attack + focus-fire + flee', () => {
		const ids = optionsFor('enemy').map((o) => o.id);
		expect(ids).toContain('attack');
		expect(ids).toContain('focus-fire');
		expect(ids).toContain('flee');
	});

	it('option ids are unique within each surface', () => {
		const kinds: SurfaceKind[] = ['floor', 'wall-world', 'wall-placed', 'enemy'];
		for (const k of kinds) {
			const ids = optionsFor(k).map((o) => o.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});
});
