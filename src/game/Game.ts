import type { LevelId } from '../levels/types';
import {
	collectHealthKit,
	damagePlayer,
	type GamePhase,
	type GameState,
	INITIAL_GAME_STATE,
	recordCivilianHit,
	recordKill,
	resumeFromContinue,
	setPhase,
	startReload,
	startRun,
	swapWeapon,
	tickReload,
	transitionLevel,
	tryConsumeAmmo,
} from './GameState';

type Listener = (state: GameState) => void;

/**
 * Mutable Game owns a GameState and broadcasts changes. The runtime
 * (src/main.ts) holds a single instance; UI overlays subscribe.
 *
 * Per the canonical-run pivot: INSERT COIN starts the run directly with
 * no picker. There is no difficulty selector and no daily challenge.
 */
export class Game {
	private state: GameState = INITIAL_GAME_STATE;
	private listeners = new Set<Listener>();

	getState(): GameState {
		return this.state;
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		listener(this.state);
		return () => {
			this.listeners.delete(listener);
		};
	}

	insertCoin(nowMs: number): void {
		this.update(startRun(nowMs));
	}

	returnToTitle(): void {
		this.update(setPhase({ ...this.state, run: null }, 'insert-coin'));
	}

	hit(target: 'head' | 'body' | 'justice'): void {
		this.update(recordKill(this.state, target));
	}

	hitCivilian(): void {
		this.update(recordCivilianHit(this.state));
	}

	takeDamage(damage: number): void {
		this.update(damagePlayer(this.state, damage));
	}

	collectHealthKit(hp?: number): void {
		this.update(collectHealthKit(this.state, hp));
	}

	continueRun(): void {
		this.update(resumeFromContinue(this.state));
	}

	endRun(toGameOver: boolean): void {
		this.update(setPhase(this.state, toGameOver ? 'game-over' : 'victory'));
	}

	transitionLevel(toLevelId: LevelId): void {
		this.update(transitionLevel(this.state, toLevelId));
	}

	// Returns true if a bullet left the barrel (ammo decremented), false on
	// misfire (reloading) or dry-pull-into-auto-reload (no shot fired).
	tryFire(nowMs: number): boolean {
		const outcome = tryConsumeAmmo(this.state, nowMs);
		if (outcome.kind === 'misfire') return false;
		this.update(outcome.state);
		return outcome.kind === 'shot';
	}

	reload(nowMs: number): void {
		this.update(startReload(this.state, nowMs));
	}

	tickReload(nowMs: number): void {
		this.update(tickReload(this.state, nowMs));
	}

	swapWeapon(): void {
		this.update(swapWeapon(this.state));
	}

	openSettings(): void {
		this.update(setPhase(this.state, 'settings'));
	}

	closeSettings(): void {
		const restoredPhase: GamePhase = this.state.run ? 'playing' : 'insert-coin';
		this.update(setPhase(this.state, restoredPhase));
	}

	openHighScores(): void {
		this.update(setPhase(this.state, 'high-scores'));
	}

	closeHighScores(): void {
		// Always returns to title; the high-scores screen is only reachable
		// from the InsertCoinOverlay today.
		this.update(setPhase(this.state, 'insert-coin'));
	}

	private update(next: GameState): void {
		if (next === this.state) return;
		this.state = next;
		for (const listener of this.listeners) {
			listener(next);
		}
	}
}
