import type { Difficulty } from '../encounter';
import type { LevelId } from '../levels/types';
import type { Lives } from '../preferences';
import {
	consumeAmmo,
	damagePlayer,
	type GameMode,
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
} from './GameState';

type Listener = (state: GameState) => void;

/**
 * Mutable Game owns a GameState and broadcasts changes. The runtime
 * (src/main.ts) holds a single instance; UI overlays subscribe.
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

	insertCoin(): void {
		this.update(setPhase(this.state, 'difficulty-select'));
	}

	chooseDifficulty(difficulty: Difficulty, lives: Lives, mode: GameMode = 'standard'): void {
		this.update(startRun(difficulty, lives, mode));
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

	continueRun(): void {
		this.update(resumeFromContinue(this.state));
	}

	endRun(toGameOver: boolean): void {
		this.update(setPhase(this.state, toGameOver ? 'game-over' : 'victory'));
	}

	transitionLevel(toLevelId: LevelId): void {
		this.update(transitionLevel(this.state, toLevelId));
	}

	// Returns true if the shot was consumed (ammo decremented), false if the
	// trigger pull was a misfire (reloading, or dry-pull triggered a reload).
	tryFire(nowMs: number): boolean {
		const next = consumeAmmo(this.state, nowMs);
		if (next === null) return false;
		// If the new state's reloadEndsAtMs is set and ammo is unchanged from
		// the previous state, the call was a dry-pull → auto-reload (no shot
		// leaves the barrel). The wrapped pure function set both atomically.
		const wasDryPull =
			this.state.run?.weapon &&
			next.run?.weapon &&
			this.state.run.weapon.reloadEndsAtMs === null &&
			next.run.weapon.reloadEndsAtMs !== null &&
			this.state.run.weapon.pistolAmmo === next.run.weapon.pistolAmmo &&
			this.state.run.weapon.rifleAmmo === next.run.weapon.rifleAmmo;
		this.update(next);
		return !wasDryPull;
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

	private update(next: GameState): void {
		if (next === this.state) return;
		this.state = next;
		for (const listener of this.listeners) {
			listener(next);
		}
	}
}
