import { createContext, type ReactNode, useContext } from 'react';

/**
 * Pause flag context. The Game view sets `paused` true while the
 * PauseMenu Dialog is open; useFrame consumers (enemy AI, projectiles,
 * any per-frame tick) check this and skip their work, freezing the
 * world while the player is in the menu.
 *
 * Why a context, not a prop drill: useFrame consumers live deep in
 * the R3F tree (under Suspense, under Physics) and are ref-driven —
 * threading a prop through every layer would be noisy. A single
 * context read at the top of each useFrame is cheap and the value
 * changes at most a few times per game.
 */
const PauseCtx = createContext<boolean>(false);

export function PauseProvider({ paused, children }: { paused: boolean; children: ReactNode }) {
	return <PauseCtx.Provider value={paused}>{children}</PauseCtx.Provider>;
}

export function usePaused(): boolean {
	return useContext(PauseCtx);
}
