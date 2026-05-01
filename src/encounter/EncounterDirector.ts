import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
	advance as advanceRail,
	createRail,
	currentLookAt,
	currentNode,
	type RailState,
	currentPosition as railPosition,
	resumeFromCombat,
} from '../rail/Rail';
import type { RailGraph } from '../rail/RailNode';
import { BOSSES, bossEnemyId, bossIdForEnemy } from './Boss';
import type { BossId, Cue, CueAction, DifficultyGate } from './cues';
import { ARCHETYPES, type ArchetypeId, type Enemy, type EnemyState } from './Enemy';
import type { FireEvent, FirePattern, FirePatternId } from './FirePattern';
import { getFirePattern } from './firePatterns';
import {
	advanceSpawnRail,
	createSpawnRailState,
	type SpawnRailGraph,
	spawnRailPosition,
} from './SpawnRail';

/**
 * EncounterDirector — the only thing with agency in the game.
 *
 * Reads a Level (camera rail + cue list + spawn rails + civilian rails) and
 * plays the screenplay. Ticked once per frame from src/main.ts; emits side
 * effects via the supplied EncounterListener.
 *
 * Mirrors docs/spec/05-screenplay-language.md.
 */

export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare' | 'un';

const DIFFICULTY_RANK: Readonly<Record<Difficulty, number>> = {
	easy: 0,
	normal: 1,
	hard: 2,
	nightmare: 3,
	un: 4,
};

const GATE_MIN_RANK: Readonly<Record<DifficultyGate, number>> = {
	'easy+': 0,
	'normal+': 1,
	'hard+': 2,
	'nightmare+': 3,
	'un-only': 4,
};

export interface DifficultyParams {
	readonly windupMultiplier: number;
	readonly fireRateMultiplier: number;
	readonly enemyHpMultiplier: number;
	readonly enemyDamageMultiplier: number;
}

export const DIFFICULTY_TABLE: Readonly<Record<Difficulty, DifficultyParams>> = {
	easy: {
		windupMultiplier: 1.5,
		fireRateMultiplier: 0.7,
		enemyHpMultiplier: 0.8,
		enemyDamageMultiplier: 0.7,
	},
	normal: {
		windupMultiplier: 1.0,
		fireRateMultiplier: 1.0,
		enemyHpMultiplier: 1.0,
		enemyDamageMultiplier: 1.0,
	},
	hard: {
		windupMultiplier: 0.85,
		fireRateMultiplier: 1.2,
		enemyHpMultiplier: 1.2,
		enemyDamageMultiplier: 1.15,
	},
	nightmare: {
		windupMultiplier: 0.65,
		fireRateMultiplier: 1.5,
		enemyHpMultiplier: 1.4,
		enemyDamageMultiplier: 1.3,
	},
	un: {
		windupMultiplier: 0.5,
		fireRateMultiplier: 1.8,
		enemyHpMultiplier: 1.6,
		enemyDamageMultiplier: 1.5,
	},
};

/**
 * Effects the director emits to the rest of the game (rendering, audio, GUI,
 * boss controllers). The runtime supplies an implementation in src/main.ts;
 * the director never touches Babylon directly itself.
 */
export interface EncounterListener {
	onCueFire(cue: Cue, action: CueAction): void;
	onEnemySpawn(enemy: Enemy): void;
	onEnemyMove(enemyId: string, position: Vector3): void;
	onEnemyHit(enemyId: string, target: 'head' | 'body' | 'justice', damage: number): void;
	onEnemyKill(enemyId: string): void;
	onEnemyCease(enemyId: string): void;
	onFireEvent(enemyId: string, event: FireEvent): void;
	onPlayerDamage(damage: number, enemyId: string): void;
	onCameraUpdate(position: Vector3, lookAt: Vector3): void;
}

export interface EncounterDirectorConfig {
	readonly cameraRail: RailGraph;
	readonly cues: readonly Cue[];
	readonly spawnRails: readonly SpawnRailGraph[];
	readonly difficulty: Difficulty;
	readonly listener: EncounterListener;
}

interface DirectorState {
	readonly rail: RailState;
	readonly elapsedMs: number;
	readonly enemies: ReadonlyMap<string, Enemy>;
	readonly firedCueIds: ReadonlySet<string>;
	readonly currentDwellNodeId: string | null;
	readonly currentDwellEnemyIds: ReadonlySet<string>;
	// True once any enemy has spawned at the current dwell node. Without
	// this, `allDwellEnemiesCleared()` returns true on the very first tick
	// after arrival — BEFORE any enemy-spawn cue has had a chance to fire
	// (cues fire in the same tick but the early-resume check used to look
	// at a stale empty set on arrival ticks where no on-arrive enemy-spawn
	// cue exists, OR on later wall-clock ticks where the spawn cue is
	// scheduled for atMs > arrival). Resets on each new dwell node.
	readonly currentDwellHadSpawn: boolean;
}

// Adaptive difficulty within a dwell node — per docs/spec/03:
//   effective_windup = base * max(ADAPTIVE_FLOOR, 1 - ADAPTIVE_STEP * hitlessKills)
// Streak resets on damage taken, missed shot, or entering a new dwell node.
// Director-internal mutation only; not surfaced to GameState.
const ADAPTIVE_FLOOR = 0.5;
const ADAPTIVE_STEP = 0.05;

export class EncounterDirector {
	private readonly cues: readonly Cue[];
	private readonly spawnRailMap: ReadonlyMap<string, SpawnRailGraph>;
	private readonly difficulty: Difficulty;
	private readonly difficultyParams: DifficultyParams;
	private readonly listener: EncounterListener;
	private state: DirectorState;
	private nextEnemySerial = 0;
	// Hitless-kill streak within the current dwell node. Director-internal;
	// resets on damage / miss / new dwell node.
	private hitlessKills = 0;
	// Phase-1 max-HP per boss. Captured on `boss-spawn` so the auto
	// `boss-phase` emitter can compute fractional HP thresholds without
	// re-deriving from `BOSSES[].hpByPhase` or `archetype.hp×hpMultiplier`
	// every hit (and so a difficulty multiplier applied at spawn is
	// honoured on the threshold).
	private readonly bossPhaseOneMaxHp = new Map<BossId, number>();

	constructor(config: EncounterDirectorConfig) {
		this.cues = config.cues.filter((c) => this.passesDifficultyGate(c, config.difficulty));
		this.spawnRailMap = new Map(config.spawnRails.map((r) => [r.id, r]));
		this.difficulty = config.difficulty;
		this.difficultyParams = DIFFICULTY_TABLE[config.difficulty];
		this.listener = config.listener;

		const rail = createRail(config.cameraRail);
		this.state = {
			rail,
			elapsedMs: 0,
			enemies: new Map(),
			firedCueIds: new Set(),
			currentDwellNodeId: null,
			currentDwellEnemyIds: new Set(),
			currentDwellHadSpawn: false,
		};
	}

	tick(dtMs: number): void {
		if (dtMs <= 0) return;

		const prev = this.state;
		const newRail = advanceRail(prev.rail, dtMs);
		const newElapsed = prev.elapsedMs + dtMs;

		const arrivedNodeId = this.detectArrival(prev.rail, newRail);
		const clearedNodeId = this.detectClear(prev.rail, newRail);

		// Publish camera each frame.
		this.listener.onCameraUpdate(railPosition(newRail), currentLookAt(newRail));

		// Tick enemies → produce fire events.
		const updatedEnemies = new Map<string, Enemy>();
		for (const [id, enemy] of prev.enemies) {
			const stepped = this.tickEnemy(enemy, dtMs);
			if (stepped.state === 'dead') continue;
			updatedEnemies.set(id, stepped);
			// Emit movement updates while the enemy is still moving. Gate on the
			// PREVIOUS atEnd state so the final tick (which transitions from
			// sliding → atEnd:true) still fires once and the mesh snaps to the
			// last waypoint instead of stopping a frame short.
			if (!enemy.rail.atEnd) {
				this.listener.onEnemyMove(id, stepped.position);
			}
		}

		// New dwell node → reset the adaptive-difficulty streak AND the
		// "had spawn" flag. Skill from a past position should not carry
		// forward as a discount on the next firing line, and the
		// early-resume gate must re-arm so the new dwell can't auto-resume
		// before any of its on-arrive enemy-spawns fire.
		const enteringNewDwell = arrivedNodeId !== null && arrivedNodeId !== prev.currentDwellNodeId;
		if (enteringNewDwell) {
			this.hitlessKills = 0;
		}

		this.state = {
			...prev,
			rail: newRail,
			elapsedMs: newElapsed,
			enemies: updatedEnemies,
			currentDwellNodeId: arrivedNodeId ?? prev.currentDwellNodeId,
			currentDwellHadSpawn: enteringNewDwell ? false : prev.currentDwellHadSpawn,
		};

		// Match wall-clock + on-arrive + on-clear cues.
		this.processCues(prev.elapsedMs, newElapsed, arrivedNodeId, clearedNodeId);

		// Early-resume condition: dwell phase, at least one enemy DID spawn
		// at this dwell, AND every dwell enemy has been killed/ceased. The
		// `currentDwellHadSpawn` gate prevents resuming on the arrival tick
		// before any on-arrive spawns fire (or on later ticks where the
		// dwell's spawn cues are wall-clock-scheduled into the future and
		// haven't fired yet).
		if (
			this.state.rail.phase === 'dwelling' &&
			this.state.currentDwellHadSpawn &&
			this.allDwellEnemiesCleared()
		) {
			this.state = { ...this.state, rail: resumeFromCombat(this.state.rail) };
		}
	}

	get cameraPosition(): Vector3 {
		return railPosition(this.state.rail);
	}

	get cameraLookAt(): Vector3 {
		return currentLookAt(this.state.rail);
	}

	get isFinished(): boolean {
		return this.state.rail.phase === 'finished';
	}

	getEnemy(enemyId: string): Enemy | undefined {
		return this.state.enemies.get(enemyId);
	}

	hitEnemy(enemyId: string, target: 'head' | 'body' | 'justice'): void {
		const enemy = this.state.enemies.get(enemyId);
		if (!enemy) return;
		const archetype = ARCHETYPES[enemy.archetypeId];
		const baseDamage = target === 'head' ? archetype.headDamage : archetype.bodyDamage;
		// justice-shot disarms; HP not really the metric, but for now treat as body
		const damage = target === 'justice' ? archetype.bodyDamage : baseDamage;
		const newHp = enemy.hp - damage;
		this.listener.onEnemyHit(enemyId, target, damage);
		if (newHp <= 0) {
			this.killEnemy(enemyId);
			return;
		}
		const updated = new Map(this.state.enemies);
		updated.set(enemyId, { ...enemy, hp: newHp });
		this.state = { ...this.state, enemies: updated };
		this.maybeAutoBossPhase(enemyId, newHp);
	}

	/**
	 * If the damaged enemy is a boss with `phaseTriggerByHpFraction`, walk the
	 * thresholds and auto-emit a synthetic `boss-phase` cue when HP first drops
	 * below the fraction × phase-1 max-HP. Spec-driven: docs/spec/00-overview.md
	 * mini-bosses are 2-phase fights with a 50% threshold; lobby's screenplay
	 * comment used to read "boss-phase transition is emitted by director on HP
	 * threshold (50%)" but the director never actually did. This is the
	 * emission. `setBossPhase` (invoked via fireCue) refreshes HP from
	 * `hpByPhase` if the boss spec includes one.
	 */
	private maybeAutoBossPhase(enemyId: string, newHp: number): void {
		const bossId = bossIdForEnemy(enemyId);
		if (!bossId) return;
		const def = BOSSES[bossId];
		if (!def?.phaseTriggerByHpFraction) return;
		const phaseOneMaxHp = this.bossPhaseOneMaxHp.get(bossId);
		if (!phaseOneMaxHp) return;
		const fired = new Set(this.state.firedCueIds);
		// Walk phases low → high so a single overkill hit that crosses two
		// thresholds emits both transitions in order.
		const triggers = Object.entries(def.phaseTriggerByHpFraction)
			.map(([k, v]) => [Number(k), v as number] as const)
			.sort((a, b) => a[0] - b[0]);
		for (const [phase, fraction] of triggers) {
			const cueId = `boss-phase-auto-${bossId}-${phase}`;
			if (fired.has(cueId)) continue;
			if (newHp >= phaseOneMaxHp * fraction) continue;
			fired.add(cueId);
			const cue: Cue = {
				id: cueId,
				trigger: { kind: 'wall-clock', atMs: this.state.elapsedMs },
				action: { verb: 'boss-phase', bossId, phase },
			};
			this.state = { ...this.state, firedCueIds: fired };
			this.fireCue(cue);
		}
	}

	private killEnemy(enemyId: string): void {
		const updated = new Map(this.state.enemies);
		updated.delete(enemyId);
		const dwell = new Set(this.state.currentDwellEnemyIds);
		dwell.delete(enemyId);
		this.state = {
			...this.state,
			enemies: updated,
			currentDwellEnemyIds: dwell,
		};
		this.hitlessKills += 1;
		this.listener.onEnemyKill(enemyId);
	}

	notifyShotResult(hit: boolean): void {
		if (!hit) this.hitlessKills = 0;
	}

	private allDwellEnemiesCleared(): boolean {
		return this.state.currentDwellEnemyIds.size === 0;
	}

	private detectArrival(prev: RailState, next: RailState): string | null {
		// On entering dwell at a new node:
		if (next.phase === 'dwelling' && prev.phase !== 'dwelling') {
			return currentNode(next).id;
		}
		// On gliding past a non-combat node (also fires `on-arrive`):
		if (next.phase === 'gliding' && prev.phase === 'gliding' && next.nodeIndex !== prev.nodeIndex) {
			return currentNode(next).id;
		}
		// Reaching the final node:
		if (next.phase === 'finished' && prev.phase !== 'finished') {
			return currentNode(next).id;
		}
		return null;
	}

	private detectClear(prev: RailState, next: RailState): string | null {
		// On dwell ending early via resumeFromCombat — i.e., dwell remaining
		// dropped to 0 OR phase changed dwell→glide while dwellRemainingMs > 0
		// was still non-zero before the reset.
		if (prev.phase === 'dwelling' && next.phase === 'gliding') {
			return currentNode(prev).id;
		}
		return null;
	}

	private processCues(
		prevElapsedMs: number,
		nextElapsedMs: number,
		arrivedNodeId: string | null,
		clearedNodeId: string | null,
	): void {
		const fired = new Set(this.state.firedCueIds);
		for (const cue of this.cues) {
			if (fired.has(cue.id)) continue;
			let shouldFire = false;
			switch (cue.trigger.kind) {
				case 'wall-clock':
					shouldFire = cue.trigger.atMs >= prevElapsedMs && cue.trigger.atMs < nextElapsedMs;
					break;
				case 'on-arrive':
					shouldFire = arrivedNodeId !== null && cue.trigger.railNodeId === arrivedNodeId;
					break;
				case 'on-clear':
					shouldFire = clearedNodeId !== null && cue.trigger.railNodeId === clearedNodeId;
					break;
			}
			if (shouldFire) {
				fired.add(cue.id);
				this.fireCue(cue);
				// `fireCue` may stamp additional keys into `state.firedCueIds`
				// (e.g. `setBossPhase` stamps the auto-emit key so HP-driven
				// re-emission can't double-fire). Merge those into our local
				// set so the final write at end of loop doesn't clobber them.
				for (const k of this.state.firedCueIds) fired.add(k);
			}
		}
		this.state = { ...this.state, firedCueIds: fired };
	}

	private fireCue(cue: Cue): void {
		this.listener.onCueFire(cue, cue.action);
		switch (cue.action.verb) {
			case 'enemy-spawn':
				this.spawnEnemy(
					cue.action.railId,
					cue.action.archetype,
					cue.action.fireProgram,
					cue.action.ceaseAfterMs,
				);
				break;
			case 'civilian-spawn':
				// Civilians have no enemy state — the listener handles them entirely
				// via the cue. Director doesn't track civilian props.
				break;
			case 'boss-spawn':
				this.spawnBoss(cue.action.bossId, cue.action.phase);
				break;
			case 'boss-phase':
				this.setBossPhase(cue.action.bossId, cue.action.phase);
				break;
			default:
				// All other verbs are pure listener side-effects.
				break;
		}
	}

	private spawnBoss(bossId: BossId, phase: number): void {
		const def = BOSSES[bossId];
		if (!def) {
			console.warn(`[director] boss-spawn unknown bossId '${bossId}'`);
			return;
		}
		const id = bossEnemyId(bossId);
		if (this.state.enemies.has(id)) {
			console.warn(`[director] boss-spawn '${bossId}' already alive — refusing duplicate spawn`);
			return;
		}
		const fireProgram = def.fireProgramByPhase[phase];
		if (!fireProgram) {
			console.warn(`[director] boss-spawn '${bossId}' has no phase ${phase} fire program`);
			return;
		}
		const railGraph = this.spawnRailMap.get(def.railIdConvention);
		if (!railGraph) {
			console.warn(`[director] boss-spawn '${bossId}' rail '${def.railIdConvention}' not in level`);
			return;
		}
		const archetype = ARCHETYPES[def.archetype];
		const railState = createSpawnRailState(railGraph);
		// `hpByPhase[1]` wins when defined (Reaper spec: 1500 P1 → 1800 P2 → 2200 P3).
		// Otherwise fall back to the long-standing `archetype.hp × hpMultiplier`
		// formula scaled by current difficulty. Either way the resulting value
		// becomes the phase-1 max-HP captured below for threshold math.
		const baseMaxHp =
			def.hpByPhase?.[phase] ??
			archetype.hp * def.hpMultiplier * this.difficultyParams.enemyHpMultiplier;
		const enemy: Enemy = {
			id,
			archetypeId: def.archetype,
			fireProgramId: fireProgram,
			rail: railState,
			elapsedMs: 0,
			nextFireEventIdx: 0,
			hp: baseMaxHp,
			state: 'sliding',
			position: spawnRailPosition(railState),
			ceaseAfterMs: null,
			alerted: true,
		};
		this.bossPhaseOneMaxHp.set(bossId, baseMaxHp);
		const updated = new Map(this.state.enemies);
		updated.set(id, enemy);
		const dwell = new Set(this.state.currentDwellEnemyIds);
		dwell.add(id);
		this.state = {
			...this.state,
			enemies: updated,
			currentDwellEnemyIds: dwell,
			currentDwellHadSpawn: true,
		};
		this.listener.onEnemySpawn(enemy);
	}

	private setBossPhase(bossId: BossId, phase: number): void {
		const def = BOSSES[bossId];
		const fireProgram = def?.fireProgramByPhase[phase];
		if (!def || !fireProgram) {
			console.warn(`[director] boss-phase '${bossId}' phase ${phase} undefined`);
			return;
		}
		const id = bossEnemyId(bossId);
		const live = this.state.enemies.get(id);
		if (!live) {
			console.warn(`[director] boss-phase '${bossId}' boss not alive`);
			return;
		}
		// If the boss spec includes per-phase HP, refresh to that value on
		// transition. Reaper escalates 1500 → 1800 → 2200 per spec; without
		// this the climax burned through all three phases on phase-1 HP and
		// died ~67% sooner than authored. Mini-bosses (no hpByPhase entry)
		// retain their current HP — phase-2 just swaps fire program.
		const refreshedHp = def.hpByPhase?.[phase] ?? live.hp;
		const updated = new Map(this.state.enemies);
		// Reset fire-program cursor + elapsed so the new program starts from
		// event 0 instead of mid-stream.
		updated.set(id, {
			...live,
			fireProgramId: fireProgram,
			elapsedMs: 0,
			nextFireEventIdx: 0,
			hp: refreshedHp,
		});
		// Stamp the auto-emit key so a subsequent HP-threshold crossing won't
		// re-fire setBossPhase for the same phase. Without this, a level
		// authoring `boss-phase` AND the auto-emitter would BOTH fire when
		// HP later drops below the fraction × phase-1 max — second pass
		// resets fire-program cursor (elapsedMs:0, nextFireEventIdx:0) and
		// erases damage taken during the transition window.
		const fired = new Set(this.state.firedCueIds);
		fired.add(`boss-phase-auto-${bossId}-${phase}`);
		this.state = { ...this.state, enemies: updated, firedCueIds: fired };
	}

	private spawnEnemy(
		railId: string,
		archetypeId: ArchetypeId,
		fireProgramId: FirePatternId,
		ceaseAfterMs: number | undefined,
	): void {
		const railGraph = this.spawnRailMap.get(railId);
		if (!railGraph) {
			console.warn(`[director] enemy-spawn references unknown spawn rail '${railId}'`);
			return;
		}
		const archetype = ARCHETYPES[archetypeId];
		const railState = createSpawnRailState(railGraph);
		const id = `${archetypeId}-${this.nextEnemySerial++}`;
		const enemy: Enemy = {
			id,
			archetypeId,
			fireProgramId,
			rail: railState,
			elapsedMs: 0,
			nextFireEventIdx: 0,
			hp: archetype.hp * this.difficultyParams.enemyHpMultiplier,
			state: 'sliding',
			position: spawnRailPosition(railState),
			ceaseAfterMs: ceaseAfterMs ?? null,
			alerted: false,
		};
		const updated = new Map(this.state.enemies);
		updated.set(id, enemy);
		const dwell = new Set(this.state.currentDwellEnemyIds);
		dwell.add(id);
		this.state = {
			...this.state,
			enemies: updated,
			currentDwellEnemyIds: dwell,
			currentDwellHadSpawn: true,
		};
		this.listener.onEnemySpawn(enemy);
	}

	private adaptiveWindupMultiplier(): number {
		return Math.max(ADAPTIVE_FLOOR, 1 - ADAPTIVE_STEP * this.hitlessKills);
	}

	private applyDifficultyToEvent(event: FireEvent): FireEvent {
		switch (event.verb) {
			case 'aim-laser':
				return {
					...event,
					durationMs:
						event.durationMs *
						this.difficultyParams.windupMultiplier *
						this.adaptiveWindupMultiplier(),
				};
			case 'fire-hitscan':
			case 'projectile-throw':
			case 'melee-contact':
				return {
					...event,
					damage: event.damage * this.difficultyParams.enemyDamageMultiplier,
				};
			default:
				return event;
		}
	}

	private shouldHoldPreAggro(
		pattern: FirePattern,
		event: FireEvent,
		enemy: Enemy,
		newElapsed: number,
	): boolean {
		return (
			pattern.preAggro === true &&
			event.verb === 'idle' &&
			event.atMs > 0 &&
			!enemy.alerted &&
			newElapsed < 5000
		);
	}

	private emitEvent(enemyId: string, event: FireEvent): void {
		this.listener.onFireEvent(enemyId, event);
		if (event.verb === 'fire-hitscan' || event.verb === 'melee-contact') {
			this.listener.onPlayerDamage(event.damage, enemyId);
			// Player took damage → reset the adaptive-difficulty streak. The
			// player is meant to feel pressure restart when they get tagged.
			this.hitlessKills = 0;
		}
	}

	private tickEnemy(enemy: Enemy, dtMs: number): Enemy {
		const newRail = advanceSpawnRail(enemy.rail, dtMs);
		const newElapsed = enemy.elapsedMs + dtMs;

		// Auto-cease on ceaseAfterMs.
		if (enemy.ceaseAfterMs !== null && newElapsed >= enemy.ceaseAfterMs) {
			this.listener.onEnemyCease(enemy.id);
			return { ...enemy, state: 'dead' };
		}

		// Tick fire program.
		const pattern: FirePattern = getFirePattern(enemy.fireProgramId);
		let nextIdx = enemy.nextFireEventIdx;
		while (nextIdx < pattern.events.length) {
			// biome-ignore lint/style/noNonNullAssertion: bounded by length above
			const event = pattern.events[nextIdx]!;
			if (event.atMs > newElapsed) break;
			if (this.shouldHoldPreAggro(pattern, event, enemy, newElapsed)) break;
			this.emitEvent(enemy.id, this.applyDifficultyToEvent(event));
			nextIdx++;
		}

		// Loop programs: when last event consumed, restart at idx 0.
		if (pattern.loop && nextIdx >= pattern.events.length) {
			return {
				...enemy,
				rail: newRail,
				elapsedMs: 0,
				nextFireEventIdx: 0,
				position: spawnRailPosition(newRail),
				state: enemy.rail.atEnd ? 'firing' : 'sliding',
			};
		}

		const newState: EnemyState =
			nextIdx >= pattern.events.length ? 'firing' : newRail.atEnd ? 'firing' : 'sliding';

		return {
			...enemy,
			rail: newRail,
			elapsedMs: newElapsed,
			nextFireEventIdx: nextIdx,
			position: spawnRailPosition(newRail),
			state: newState,
		};
	}

	private passesDifficultyGate(cue: Cue, difficulty: Difficulty = this.difficulty): boolean {
		if (!cue.difficulty) return true;
		const minRank = GATE_MIN_RANK[cue.difficulty];
		const myRank = DIFFICULTY_RANK[difficulty];
		return myRank >= minRank;
	}

	/**
	 * Director-issued alert: emitted when player fires, sibling enemy dies, or
	 * timeout. Wakes pre-aggro enemies. Called from the runtime (src/main.ts)
	 * on player-fire events.
	 */
	emitAlert(): void {
		const updated = new Map<string, Enemy>();
		for (const [id, enemy] of this.state.enemies) {
			updated.set(id, enemy.alerted ? enemy : { ...enemy, alerted: true });
		}
		this.state = { ...this.state, enemies: updated };
	}
}
