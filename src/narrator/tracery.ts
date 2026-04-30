import type { Rng } from '@/world/generator/rng';

/**
 * Tracery-style memo generator (PRQ-B5, M5). Pure-data: a flat
 * grammar object + a recursive `expand` that swaps `#symbol#` tokens
 * with a random pick from the corresponding rule. No external dep —
 * the spec calls for "Tracery grammar" as a vibe, not a library lock.
 *
 * Memos drop from killed managers + are surfaced in the PauseMenu
 * Journal tab + on the GameOver run report. Deterministic per seed
 * so save/replay shows the same memos.
 */

interface Grammar {
	memo: string[];
	noun: string[];
	adjective: string[];
	department: string[];
	process: string[];
	consequence: string[];
}

export const MEMO_GRAMMAR: Grammar = {
	memo: [
		'Per #department#, all #adjective# #noun# must be filed by EOD or face #consequence#.',
		'REMINDER: #process# is mandatory. Repeat: #process# is mandatory.',
		'Effective immediately, #department# has #adjective# all #noun#. Discuss with HR.',
		'The #adjective# #noun# you submitted is being #process#. Expect #consequence#.',
		'Annual review attached. Your #adjective# performance has triggered #process#.',
		'It has come to our attention that the #noun# in your possession is #adjective#.',
	],
	noun: [
		'cubicle',
		'stapler',
		'three-hole punch',
		'memo',
		'expense report',
		'whiteboard',
		'quarterly review',
	],
	adjective: [
		'redundant',
		'pending',
		'unauthorized',
		'compliant',
		'flagged',
		'consolidated',
		'sub-optimal',
	],
	department: ['HR', 'Compliance', 'Internal Audit', 'Legal', 'Operations', 'Procurement'],
	process: [
		'redundantization',
		'reorganization',
		'auditing',
		'reviewing',
		'archiving',
		'consolidating',
	],
	consequence: [
		'redundantization',
		'a stamped notice',
		'a meeting with HR',
		'permanent archival',
		'further review',
		'office relocation',
	],
};

export function generateMemo(rng: Rng, grammar: Grammar = MEMO_GRAMMAR): string {
	const seed = rng.pick(grammar.memo);
	return expand(seed, grammar, rng);
}

function expand(template: string, grammar: Grammar, rng: Rng): string {
	let out = template;
	let safety = 16;
	while (out.includes('#') && safety-- > 0) {
		out = out.replace(/#([a-z]+)#/g, (_, key: string) => {
			const list = (grammar as unknown as Record<string, string[]>)[key];
			if (!list || list.length === 0) return key;
			return rng.pick(list);
		});
	}
	return out;
}
