import type { HudOverlay, NarratorOverlay } from '../gui';

/**
 * Mutable bookkeeping for the overlay subsystem. Holds the current overlay's
 * dispose callback, a generation counter for async overlay races, and the
 * persistent HUD/narrator instances that live across the playing/continue
 * window.
 *
 * Why not also extract the routing logic? It depends on ~15 cross-module
 * symbols (game, overlay, reticle, settings, getBalance, audioBus, scene,
 * director, plus every overlay class). A clean extraction needs the level-
 * lifecycle reset (currently inline in the insert-coin branch) factored out
 * first — that's a separate slice. This module pins the state, leaves the
 * routing in main.ts.
 */
export class OverlayState {
	activeDispose: (() => void) | null = null;
	/** Bumped every time `routeOverlay` swaps the active overlay. Async overlay
	 * constructors capture this token at dispatch and bail if it has changed
	 * by resolution time, so they cannot install a stale overlay over a newer
	 * phase. */
	generation = 0;
	hud: HudOverlay | null = null;
	narrator: NarratorOverlay | null = null;
	/** Set while the friend modal is on screen so a rapid second tap on the
	 * title-screen INSERT COIN button cannot stack a second modal (which
	 * would resolve into a double bailout). Always cleared in modal dismiss. */
	friendModalOpen = false;

	disposeActive(): void {
		if (this.activeDispose) {
			this.activeDispose();
			this.activeDispose = null;
		}
	}
}
