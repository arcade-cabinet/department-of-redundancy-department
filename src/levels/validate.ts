import { BOSSES } from '../encounter/Boss';
import type { Cue, CueAction } from '../encounter/cues';
import { ARCHETYPES } from '../encounter/Enemy';
import { FIRE_PATTERNS } from '../encounter/firePatterns';
import { LEVELS } from './index';
import type { Level, LevelId } from './types';

/**
 * Static integrity check for a Level data file. Catches the data-vs-data
 * drift that typecheck cannot — a cue can target a `doorId: 'door-foo'`
 * with the type-checker happy, but if that door isn't in the primitives
 * array the runtime cue silently no-ops.
 *
 * This validator is the cheapest, highest-payback test layer. It runs
 * in the Vitest node environment with no Babylon scene needed. Each
 * authored Level *must* pass it before being registered in `LEVELS`.
 *
 * What it does NOT do:
 *   - Boot a Babylon scene
 *   - Fire pointer events
 *   - Take screenshots
 *   - Verify ambience actually plays
 * Those belong in `tests/browser/` and `tests/visual/`, neither of which
 * exists yet — see the test-pyramid in profiles/ts-browser-game.md.
 */

export interface ValidationIssue {
	readonly severity: 'error' | 'warning';
	readonly code: string;
	readonly message: string;
}

export interface ValidationReport {
	readonly levelId: LevelId;
	readonly issues: readonly ValidationIssue[];
}

interface LevelIndex {
	readonly doorIds: ReadonlySet<string>;
	readonly shutterIds: ReadonlySet<string>;
	readonly lightIds: ReadonlySet<string>;
	readonly propIds: ReadonlySet<string>;
	readonly spawnRailIds: ReadonlySet<string>;
	readonly civilianRailIds: ReadonlySet<string>;
	readonly ambienceLayerIds: ReadonlySet<string>;
	readonly railNodeIds: ReadonlySet<string>;
}

class IssueLog {
	readonly issues: ValidationIssue[] = [];
	err(code: string, message: string): void {
		this.issues.push({ severity: 'error', code, message });
	}
	warn(code: string, message: string): void {
		this.issues.push({ severity: 'warning', code, message });
	}
}

function addUnique<T extends string>(
	set: Set<T>,
	id: T,
	code: string,
	what: string,
	log: IssueLog,
): void {
	if (set.has(id)) log.err(code, `duplicate ${what} id '${id}'`);
	else set.add(id);
}

function checkHealthKit(
	wallId: string,
	kit: { id: string; hp: number },
	healthKitIds: Set<string>,
	log: IssueLog,
): void {
	if (healthKitIds.has(kit.id)) {
		log.err('DUP_HEALTH_KIT_ID', `duplicate healthKit id '${kit.id}'`);
	} else {
		healthKitIds.add(kit.id);
	}
	if (!Number.isFinite(kit.hp) || kit.hp <= 0) {
		log.err(
			'HEALTH_KIT_BAD_HP',
			`healthKit '${kit.id}' on wall '${wallId}' must have positive finite hp (got ${kit.hp})`,
		);
	}
}

interface PrimitiveBuckets {
	readonly doorIds: Set<string>;
	readonly shutterIds: Set<string>;
	readonly lightIds: Set<string>;
	readonly propIds: Set<string>;
	readonly healthKitIds: Set<string>;
}

function bucketPrimitive(p: Level['primitives'][number], buckets: PrimitiveBuckets): void {
	if (p.kind === 'door') buckets.doorIds.add(p.id);
	else if (p.kind === 'shutter') buckets.shutterIds.add(p.id);
	else if (p.kind === 'light') buckets.lightIds.add(p.id);
	else if (p.kind === 'prop') buckets.propIds.add(p.id);
}

function indexPrimitives(level: Level, log: IssueLog): PrimitiveBuckets {
	const seen = new Set<string>();
	const buckets: PrimitiveBuckets = {
		doorIds: new Set(),
		shutterIds: new Set(),
		lightIds: new Set(),
		propIds: new Set(),
		// Wall.healthKit?.id collisions silently clobber the LevelHandles
		// healthKits map at runtime; catch them here.
		healthKitIds: new Set(),
	};
	for (const p of level.primitives) {
		if (seen.has(p.id)) {
			log.err('DUP_PRIMITIVE_ID', `duplicate primitive id '${p.id}'`);
			continue;
		}
		seen.add(p.id);
		bucketPrimitive(p, buckets);
		if (p.kind === 'wall' && p.healthKit) {
			checkHealthKit(p.id, p.healthKit, buckets.healthKitIds, log);
		}
	}
	return buckets;
}

function indexLevel(level: Level, log: IssueLog): LevelIndex {
	// healthKitIds bucket is built + validated in indexPrimitives but not
	// returned in the LevelIndex — no cue verb references kits today.
	const { doorIds, shutterIds, lightIds, propIds } = indexPrimitives(level, log);

	const spawnRailIds = new Set<string>();
	for (const r of level.spawnRails) {
		addUnique(spawnRailIds, r.id, 'DUP_SPAWN_RAIL_ID', 'spawnRail', log);
	}
	const civilianRailIds = new Set<string>();
	for (const r of level.civilianRails) {
		addUnique(civilianRailIds, r.id, 'DUP_CIV_RAIL_ID', 'civilianRail', log);
	}
	const ambienceLayerIds = new Set<string>();
	for (const l of level.ambienceLayers) {
		addUnique(ambienceLayerIds, l.id, 'DUP_AMBIENCE_ID', 'ambienceLayer', log);
	}
	const railNodeIds = new Set<string>();
	for (const n of level.cameraRail.nodes) {
		addUnique(railNodeIds, n.id, 'DUP_RAIL_NODE_ID', 'cameraRail node', log);
	}

	return {
		doorIds,
		shutterIds,
		lightIds,
		propIds,
		spawnRailIds,
		civilianRailIds,
		ambienceLayerIds,
		railNodeIds,
	};
}

function checkSpawnRails(level: Level, log: IssueLog): void {
	for (const r of level.spawnRails) {
		if (r.path.length < 2) log.err('SPAWN_RAIL_TOO_SHORT', `spawnRail '${r.id}' has <2 points`);
		if (r.speed <= 0) log.err('SPAWN_RAIL_BAD_SPEED', `spawnRail '${r.id}' speed must be > 0`);
	}
}

function checkCivilianRails(level: Level, log: IssueLog): void {
	for (const r of level.civilianRails) {
		if (r.path.length < 2) log.err('CIV_RAIL_TOO_SHORT', `civilianRail '${r.id}' has <2 points`);
		if (r.speed <= 0) log.err('CIV_RAIL_BAD_SPEED', `civilianRail '${r.id}' speed must be > 0`);
	}
}

function checkPrimitiveRailRefs(level: Level, index: LevelIndex, log: IssueLog): void {
	for (const p of level.primitives) {
		if (p.kind === 'door' && p.spawnRailId && !index.spawnRailIds.has(p.spawnRailId)) {
			log.err('DOOR_DANGLING_RAIL', `door '${p.id}' spawnRailId '${p.spawnRailId}' not found`);
		}
		if (p.kind === 'shutter' && p.spawnRailId && !index.spawnRailIds.has(p.spawnRailId)) {
			log.err(
				'SHUTTER_DANGLING_RAIL',
				`shutter '${p.id}' spawnRailId '${p.spawnRailId}' not found`,
			);
		}
	}
}

function checkRails(level: Level, index: LevelIndex, log: IssueLog): void {
	checkSpawnRails(level, log);
	checkCivilianRails(level, log);
	checkPrimitiveRailRefs(level, index, log);
}

function checkCameraRail(level: Level, log: IssueLog): void {
	if (level.cameraRail.nodes.length < 2) {
		log.err('CAMERA_RAIL_TOO_SHORT', 'cameraRail must have ≥2 nodes');
	}
	for (const n of level.cameraRail.nodes) {
		if (n.kind === 'combat' && (n.dwellMs ?? 0) <= 0) {
			log.err('CAMERA_COMBAT_NO_DWELL', `combat node '${n.id}' missing positive dwellMs`);
		}
	}
}

function checkCueTrigger(cue: Cue, index: LevelIndex, log: IssueLog): void {
	if (cue.trigger.kind === 'on-arrive' || cue.trigger.kind === 'on-clear') {
		if (!index.railNodeIds.has(cue.trigger.railNodeId)) {
			log.err(
				'CUE_DANGLING_RAIL_NODE',
				`cue '${cue.id}' trigger.railNodeId '${cue.trigger.railNodeId}' not in cameraRail`,
			);
		}
	}
}

// Lookup table: each cue verb that needs validation maps to a checker that
// takes the action + level index + log. Splitting into a table keeps the
// per-verb branching out of one cognitively-large switch.
type CheckerEntry = (cue: Cue, a: CueAction, index: LevelIndex, log: IssueLog) => void;

const CUE_CHECKERS: Readonly<Partial<Record<CueAction['verb'], CheckerEntry>>> = {
	door: (cue, a, index, log) => {
		if (a.verb !== 'door') return;
		if (!index.doorIds.has(a.doorId))
			log.err('CUE_DANGLING_DOOR', `cue '${cue.id}' targets unknown door '${a.doorId}'`);
	},
	shutter: (cue, a, index, log) => {
		if (a.verb !== 'shutter') return;
		if (!index.shutterIds.has(a.shutterId))
			log.err('CUE_DANGLING_SHUTTER', `cue '${cue.id}' targets unknown shutter '${a.shutterId}'`);
	},
	lighting: (cue, a, index, log) => {
		if (a.verb !== 'lighting') return;
		if (!index.lightIds.has(a.lightId))
			log.err('CUE_DANGLING_LIGHT', `cue '${cue.id}' targets unknown light '${a.lightId}'`);
	},
	'ambience-fade': (cue, a, index, log) => {
		if (a.verb !== 'ambience-fade') return;
		if (!index.ambienceLayerIds.has(a.layerId))
			log.err(
				'CUE_DANGLING_AMBIENCE',
				`cue '${cue.id}' targets unknown ambience layer '${a.layerId}'`,
			);
	},
	'enemy-spawn': (cue, a, index, log) => {
		if (a.verb !== 'enemy-spawn') return;
		checkEnemySpawn(cue, a, index, log);
	},
	'civilian-spawn': (cue, a, index, log) => {
		if (a.verb !== 'civilian-spawn') return;
		if (!index.civilianRailIds.has(a.railId))
			log.err(
				'CUE_DANGLING_CIV_RAIL',
				`cue '${cue.id}' targets unknown civilianRail '${a.railId}'`,
			);
	},
	'prop-anim': (cue, a, index, log) => {
		if (a.verb !== 'prop-anim') return;
		if (!index.propIds.has(a.propId))
			log.warn('CUE_DANGLING_PROP', `cue '${cue.id}' targets unknown prop '${a.propId}'`);
	},
	'boss-spawn': (cue, a, index, log) => {
		if (a.verb !== 'boss-spawn') return;
		const def = checkBossIdAndPhase(cue, a.bossId, a.phase, log);
		if (def && !index.spawnRailIds.has(def.railIdConvention)) {
			log.err(
				'CUE_BOSS_RAIL_MISSING',
				`cue '${cue.id}' boss '${a.bossId}' requires spawnRail '${def.railIdConvention}'`,
			);
		}
	},
	'boss-phase': (cue, a, _index, log) => {
		if (a.verb !== 'boss-phase') return;
		checkBossIdAndPhase(cue, a.bossId, a.phase, log);
	},
	transition: (cue, a, _index, log) => {
		if (a.verb !== 'transition') return;
		if (a.toLevelId !== 'victory' && LEVELS[a.toLevelId] === undefined)
			log.warn(
				'CUE_TRANSITION_UNIMPLEMENTED',
				`cue '${cue.id}' transitions to unimplemented level '${a.toLevelId}'`,
			);
	},
};

function checkCueAction(cue: Cue, a: CueAction, index: LevelIndex, log: IssueLog): void {
	const checker = CUE_CHECKERS[a.verb];
	if (checker) checker(cue, a, index, log);
}

function checkBossIdAndPhase(
	cue: Cue,
	bossId: string,
	phase: number,
	log: IssueLog,
): (typeof BOSSES)[keyof typeof BOSSES] | undefined {
	const def = BOSSES[bossId as keyof typeof BOSSES];
	if (!def) {
		log.err('CUE_UNKNOWN_BOSS', `cue '${cue.id}' uses unknown bossId '${bossId}'`);
		return undefined;
	}
	if (!def.fireProgramByPhase[phase]) {
		log.err(
			'CUE_BOSS_PHASE_UNDEFINED',
			`cue '${cue.id}' boss '${bossId}' has no phase ${phase} fire program`,
		);
	}
	return def;
}

function checkEnemySpawn(
	cue: Cue,
	a: Extract<CueAction, { verb: 'enemy-spawn' }>,
	index: LevelIndex,
	log: IssueLog,
): void {
	if (!index.spawnRailIds.has(a.railId)) {
		log.err('CUE_DANGLING_SPAWN_RAIL', `cue '${cue.id}' targets unknown spawnRail '${a.railId}'`);
	}
	if (!(a.archetype in ARCHETYPES)) {
		log.err('CUE_UNKNOWN_ARCHETYPE', `cue '${cue.id}' uses unknown archetype '${a.archetype}'`);
	}
	if (!(a.fireProgram in FIRE_PATTERNS)) {
		log.err(
			'CUE_UNKNOWN_FIRE_PROGRAM',
			`cue '${cue.id}' uses unknown fireProgram '${a.fireProgram}'`,
		);
	}
}

function checkCues(level: Level, index: LevelIndex, log: IssueLog): void {
	const seenIds = new Set<string>();
	let sawEnd = false;
	for (const cue of level.cues) {
		if (seenIds.has(cue.id)) log.err('DUP_CUE_ID', `duplicate cue id '${cue.id}'`);
		seenIds.add(cue.id);
		checkCueTrigger(cue, index, log);
		checkCueAction(cue, cue.action, index, log);
		if (cue.action.verb === 'transition' || cue.action.verb === 'boss-spawn') sawEnd = true;
	}
	if (!sawEnd) log.warn('LEVEL_NO_END', `level '${level.id}' has no transition or boss-spawn cue`);
}

export function validateLevel(level: Level): ValidationReport {
	const log = new IssueLog();
	const index = indexLevel(level, log);
	checkRails(level, index, log);
	checkCameraRail(level, log);
	checkCues(level, index, log);
	return { levelId: level.id, issues: log.issues };
}

/**
 * Validate every registered level. Returns the worst severity seen plus the
 * full set of reports. Used by the test suite to gate level data quality.
 */
export function validateAllLevels(): {
	worstSeverity: 'error' | 'warning' | 'ok';
	reports: readonly ValidationReport[];
} {
	const reports: ValidationReport[] = [];
	let worst: 'error' | 'warning' | 'ok' = 'ok';
	for (const level of Object.values(LEVELS)) {
		if (!level) continue;
		const report = validateLevel(level as Level);
		reports.push(report);
		for (const issue of report.issues) {
			if (issue.severity === 'error') worst = 'error';
			else if (issue.severity === 'warning' && worst === 'ok') worst = 'warning';
		}
	}
	return { worstSeverity: worst, reports };
}

/** Convenience: pretty-print a report. */
export function formatReport(report: ValidationReport): string {
	const lines: string[] = [`level '${report.levelId}':`];
	if (report.issues.length === 0) {
		lines.push('  ok');
	} else {
		for (const issue of report.issues) {
			lines.push(`  [${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}`);
		}
	}
	return lines.join('\n');
}

/** Sum of beats expected at this level — `enemy-spawn` cues. */
export function totalEnemyCount(level: Level): number {
	return level.cues.filter((c) => c.action.verb === 'enemy-spawn').length;
}

/** Length of the level in milliseconds (max wall-clock cue time). */
export function levelDurationMs(level: Level): number {
	let max = 0;
	for (const cue of level.cues) {
		if (cue.trigger.kind === 'wall-clock' && cue.trigger.atMs > max) {
			max = cue.trigger.atMs;
		}
	}
	return max;
}

// Re-export for tests.
export type { Cue };
