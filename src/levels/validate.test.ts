import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, it } from 'vitest';
import { LEVELS } from './index';
import type { Level } from './types';
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

	it('lobby-specific shape (sanity baseline)', () => {
		const lobby = LEVELS.lobby;
		expect(lobby).toBeDefined();
		if (!lobby) return;
		const report = validateLevel(lobby);
		expect(report.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
		expect(totalEnemyCount(lobby)).toBeGreaterThan(0);
		expect(levelDurationMs(lobby)).toBeGreaterThan(60000);
	});

	it('formatReport renders ok-line for a clean level', () => {
		// Synthetic minimal level — exercises the zero-issues "ok" branch in
		// formatReport that no real registered level can reach (every shipped
		// level has at least informational warnings on forward references).
		const clean: Level = {
			id: 'victory',
			displayName: 'test-clean',
			primitives: [],
			spawnRails: [],
			civilianRails: [],
			ambienceLayers: [],
			cameraRail: {
				defaultSpeedUps: 3,
				nodes: [
					{ id: 'a', kind: 'glide', position: new Vector3(0, 0, 0), lookAt: new Vector3(0, 0, 1) },
					{ id: 'b', kind: 'glide', position: new Vector3(0, 0, 1), lookAt: new Vector3(0, 0, 2) },
				],
			},
			cues: [
				{
					id: 'end',
					trigger: { kind: 'wall-clock', atMs: 1000 },
					action: { verb: 'transition', toLevelId: 'victory' },
				},
			],
		};
		const report = validateLevel(clean);
		expect(report.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
		const formatted = formatReport(report);
		expect(formatted).toContain("level 'victory'");
		expect(formatted).toContain('  ok');
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

	it('flags duplicate healthKit ids across walls', () => {
		const level: Level = {
			id: 'victory',
			displayName: 'test-dup-kit',
			primitives: [
				{
					id: 'wall-a',
					kind: 'wall',
					origin: new Vector3(0, 0, 0),
					yaw: 0,
					width: 4,
					height: 3,
					pbr: 'drywall',
					healthKit: { id: 'kit-x', hp: 35 },
				},
				{
					id: 'wall-b',
					kind: 'wall',
					origin: new Vector3(0, 0, 4),
					yaw: 0,
					width: 4,
					height: 3,
					pbr: 'drywall',
					healthKit: { id: 'kit-x', hp: 35 },
				},
			],
			spawnRails: [],
			civilianRails: [],
			ambienceLayers: [],
			cameraRail: {
				defaultSpeedUps: 3,
				nodes: [
					{ id: 'a', kind: 'glide', position: new Vector3(0, 0, 0), lookAt: new Vector3(0, 0, 1) },
					{ id: 'b', kind: 'glide', position: new Vector3(0, 0, 1), lookAt: new Vector3(0, 0, 2) },
				],
			},
			cues: [
				{
					id: 'end',
					trigger: { kind: 'wall-clock', atMs: 1000 },
					action: { verb: 'transition', toLevelId: 'victory' },
				},
			],
		};
		const report = validateLevel(level);
		const codes = report.issues.map((i) => i.code);
		expect(codes).toContain('DUP_HEALTH_KIT_ID');
	});

	it('flags non-positive healthKit hp', () => {
		const level: Level = {
			id: 'victory',
			displayName: 'test-bad-hp',
			primitives: [
				{
					id: 'wall-a',
					kind: 'wall',
					origin: new Vector3(0, 0, 0),
					yaw: 0,
					width: 4,
					height: 3,
					pbr: 'drywall',
					healthKit: { id: 'kit-zero', hp: 0 },
				},
			],
			spawnRails: [],
			civilianRails: [],
			ambienceLayers: [],
			cameraRail: {
				defaultSpeedUps: 3,
				nodes: [
					{ id: 'a', kind: 'glide', position: new Vector3(0, 0, 0), lookAt: new Vector3(0, 0, 1) },
					{ id: 'b', kind: 'glide', position: new Vector3(0, 0, 1), lookAt: new Vector3(0, 0, 2) },
				],
			},
			cues: [
				{
					id: 'end',
					trigger: { kind: 'wall-clock', atMs: 1000 },
					action: { verb: 'transition', toLevelId: 'victory' },
				},
			],
		};
		const report = validateLevel(level);
		const codes = report.issues.map((i) => i.code);
		expect(codes).toContain('HEALTH_KIT_BAD_HP');
	});
});
