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
import { BOSSES, bossEnemyId } from './Boss';
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
}

export class EncounterDirector {
	private readonly cues: readonly Cue[];
	private readonly spawnRailMap: ReadonlyMap<string, SpawnRailGraph>;
	private readonly difficulty: Difficulty;
	private readonly difficultyParams: DifficultyParams;
	private readonly listener: EncounterListener;
	private state: DirectorState;
	private nextEnemySerial = 0;

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

		this.state = {
			...prev,
			rail: newRail,
			elapsedMs: newElapsed,
			enemies: updatedEnemies,
			currentDwellNodeId: arrivedNodeId ?? prev.currentDwellNodeId,
		};

		// Match wall-clock + on-arrive + on-clear cues.
		this.processCues(prev.elapsedMs, newElapsed, arrivedNodeId, clearedNodeId);

		// If dwell finished and all dwell enemies cleared → resume rail.
		if (this.state.rail.phase === 'dwelling' && this.allDwellEnemiesCleared()) {
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
		} else {
			const updated = new Map(this.state.enemies);
			updated.set(enemyId, { ...enemy, hp: newHp });
			this.state = { ...this.state, enemies: updated };
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
		this.listener.onEnemyKill(enemyId);
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
		const enemy: Enemy = {
			id,
			archetypeId: def.archetype,
			fireProgramId: fireProgram,
			rail: railState,
			elapsedMs: 0,
			nextFireEventIdx: 0,
			hp: archetype.hp * def.hpMultiplier * this.difficultyParams.enemyHpMultiplier,
			state: 'sliding',
			position: spawnRailPosition(railState),
			ceaseAfterMs: null,
			alerted: true,
		};
		const updated = new Map(this.state.enemies);
		updated.set(id, enemy);
		const dwell = new Set(this.state.currentDwellEnemyIds);
		dwell.add(id);
		this.state = { ...this.state, enemies: updated, currentDwellEnemyIds: dwell };
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
		const updated = new Map(this.state.enemies);
		// Reset fire-program cursor + elapsed so the new program starts from
		// event 0 instead of mid-stream.
		updated.set(id, { ...live, fireProgramId: fireProgram, elapsedMs: 0, nextFireEventIdx: 0 });
		this.state = { ...this.state, enemies: updated };
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
		this.state = { ...this.state, enemies: updated, currentDwellEnemyIds: dwell };
		this.listener.onEnemySpawn(enemy);
	}

	private applyDifficultyToEvent(event: FireEvent): FireEvent {
		switch (event.verb) {
			case 'aim-laser':
				return {
					...event,
					durationMs: event.durationMs * this.difficultyParams.windupMultiplier,
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
