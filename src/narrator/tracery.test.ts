import { describe, expect, it } from 'vitest';
import { createRng } from '@/world/generator/rng';
import { generateMemo, MEMO_GRAMMAR } from './tracery';

describe('Tracery narrator (PRQ-B5)', () => {
	it('generateMemo returns a non-empty string', () => {
		const m = generateMemo(createRng('seed-A'));
		expect(m.length).toBeGreaterThan(0);
	});

	it('grammar has at least 4 top-level memo templates', () => {
		expect(MEMO_GRAMMAR.memo.length).toBeGreaterThanOrEqual(4);
	});

	it('determinism: same rng + same grammar = same output', () => {
		const a = generateMemo(createRng('det'));
		const b = generateMemo(createRng('det'));
		expect(a).toBe(b);
	});

	it('output has no #placeholder# leftovers (all symbols expanded)', () => {
		for (let i = 0; i < 25; i++) {
			const m = generateMemo(createRng(`expand-${i}`));
			expect(m).not.toMatch(/#[a-z]+#/);
		}
	});
});
