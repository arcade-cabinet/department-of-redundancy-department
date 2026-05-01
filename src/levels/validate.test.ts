import { describe, expect, it } from 'vitest';
import { LEVELS } from './index';
import {
	formatReport,
	levelDurationMs,
	totalEnemyCount,
	validateAllLevels,
	validateLevel,
} from './validate';

describe('level validator', () => {
	it('every registered level passes integrity checks', () => {
		const { reports } = validateAllLevels();
		const errors = reports.flatMap((r) =>
			r.issues
				.filter((i) => i.severity === 'error')
				.map((i) => `${r.levelId}: ${i.code} — ${i.message}`),
		);
		if (errors.length > 0) {
			throw new Error(`Level validation errors:\n${errors.join('\n')}`);
		}
	});

	it('each registered level has at least one transition or boss-spawn', () => {
		for (const [id, level] of Object.entries(LEVELS)) {
			if (!level) continue;
			const verbs = new Set(level.cues.map((c) => c.action.verb));
			expect(
				verbs.has('transition') || verbs.has('boss-spawn'),
				`level '${id}' has neither transition nor boss-spawn`,
			).toBe(true);
		}
	});

	it('every cue trigger references a real cameraRail node', () => {
		for (const [id, level] of Object.entries(LEVELS)) {
			if (!level) continue;
			const nodeIds = new Set(level.cameraRail.nodes.map((n) => n.id));
			for (const cue of level.cues) {
				if (cue.trigger.kind === 'on-arrive' || cue.trigger.kind === 'on-clear') {
					expect(
						nodeIds.has(cue.trigger.railNodeId),
						`level '${id}' cue '${cue.id}' references missing rail node '${cue.trigger.railNodeId}'`,
					).toBe(true);
				}
			}
		}
	});

	it('lobby-specific shape (sanity baseline)', () => {
		const lobby = LEVELS.lobby;
		expect(lobby).toBeDefined();
		if (!lobby) return;
		const report = validateLevel(lobby);
		expect(report.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
		expect(totalEnemyCount(lobby)).toBeGreaterThan(0);
		expect(levelDurationMs(lobby)).toBeGreaterThan(60000);
	});

	it('formatReport renders ok when there are no issues', () => {
		const lobby = LEVELS.lobby;
		if (!lobby) return;
		const report = validateLevel(lobby);
		const formatted = formatReport(report);
		expect(formatted).toContain("level 'lobby'");
	});

	// Surfaces all warnings (e.g. transitions to unimplemented levels) on
	// stdout so authors can see drift without having to run a separate CLI.
	// This test never fails — the strict gate is the `every registered level
	// passes integrity checks` test above, which only fails on errors.
	it('reports warnings for visibility (informational)', () => {
		const { reports } = validateAllLevels();
		const warningLines: string[] = [];
		for (const r of reports) {
			for (const w of r.issues.filter((i) => i.severity === 'warning')) {
				warningLines.push(`${r.levelId}: ${w.code} — ${w.message}`);
			}
		}
		if (warningLines.length > 0) {
			console.log(`[level-validator] ${warningLines.length} warning(s):`);
			for (const l of warningLines) console.log(`  ${l}`);
		}
		// No assertion — purely informational.
	});
});
