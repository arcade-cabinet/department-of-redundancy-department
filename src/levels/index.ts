import { lobbyLevel } from './lobby';
import type { Level, LevelId } from './types';

export type { AmbienceLayer, CivilianRail, Level, LevelId, Primitive, SpawnRail } from './types';

/**
 * Level registry — one entry per LevelId. The runtime looks up a level by id
 * on `transition` cue and constructs it.
 *
 * NOTE: For v1 boot, only the Lobby is implemented. Subsequent levels are
 * authored from their respective canon docs and added here. Each new level
 * is a content task — the engine and types are already in place.
 */
export const LEVELS: Readonly<Partial<Record<LevelId, Level>>> = {
	lobby: lobbyLevel,
};

export function getLevel(id: LevelId): Level {
	const level = LEVELS[id];
	if (!level) {
		throw new Error(`Level '${id}' is not yet implemented. See docs/spec/levels/${id}.md.`);
	}
	return level;
}
