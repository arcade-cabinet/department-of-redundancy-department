import type { CueAction } from './cues';

/**
 * The set of cue verbs whose runtime handlers depend on `levelHandles`
 * (the doors / shutters / lights / props / health-kit Maps populated by
 * `buildLevel(...)`). Cues fired before `buildLevel` resolves are queued
 * and drained once handles arrive — without this, an early cue that
 * references e.g. a door silently no-ops because `levelHandles` is null.
 *
 * Verbs absent from this set (transition, civilian-spawn, audio-stinger,
 * ambience-fade, narrator, camera-shake, enemy-spawn, boss-spawn, boss-
 * phase) have no `levelHandles` dependency and run immediately.
 *
 * Centralized here so unit tests can pin the classification without
 * having to boot the runtime, and so runtime + tests can never disagree.
 */
export const HANDLES_DEPENDENT_VERBS: ReadonlySet<CueAction['verb']> = new Set([
	'door',
	'shutter',
	'lighting',
	'level-event',
	'prop-anim',
]);

export function isHandlesDependent(action: CueAction): boolean {
	return HANDLES_DEPENDENT_VERBS.has(action.verb);
}
