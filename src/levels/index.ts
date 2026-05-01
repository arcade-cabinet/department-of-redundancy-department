import { executiveLevel } from './executive';
import { hrCorridorLevel } from './hr-corridor';
import { lobbyLevel } from './lobby';
import { openPlanLevel } from './open-plan';
import { stairwayALevel } from './stairway-A';
import { stairwayBLevel } from './stairway-B';
import { stairwayCLevel } from './stairway-C';
import type { Level, LevelId } from './types';

export type { AmbienceLayer, CivilianRail, Level, LevelId, Primitive, SpawnRail } from './types';

/**
 * Level registry — one entry per LevelId. The runtime looks up a level by id
 * on `transition` cue and constructs it.
 *
 * Each level is authored from its canon doc in docs/spec/levels/. Levels are
 * added here as their data files land; missing levels throw on transition.
 */
export const LEVELS: Readonly<Partial<Record<LevelId, Level>>> = {
	lobby: lobbyLevel,
	'stairway-A': stairwayALevel,
	'open-plan': openPlanLevel,
	'stairway-B': stairwayBLevel,
	'hr-corridor': hrCorridorLevel,
	'stairway-C': stairwayCLevel,
	executive: executiveLevel,
};

export function getLevel(id: LevelId): Level {
	const level = LEVELS[id];
	if (!level) {
		throw new Error(`Level '${id}' is not yet implemented. See docs/spec/levels/${id}.md.`);
	}
	return level;
}
