import type { CueAction } from './cues';

/**
 * The set of cue verbs whose runtime handlers depend on `levelHandles`
 * (the doors / shutters / lights / props / health-kit Maps populated by
 * `buildLevel(...)`). Cues fired before `buildLevel` resolves are queued
 * and drained once handles arrive — without this, an early cue that
 * references e.g. a door silently no-ops because `levelHandles` is null.
 *
 * Verbs not in this set run immediately; see the `CueAction['verb']`
 * union in `cues.ts` for the full vocabulary. Centralized here so
 * runtime + tests share one source of truth.
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

/**
 * Snapshot-then-clear drain: returns the queued actions in insertion order
 * and empties the input array atomically. The caller dispatches each
 * returned action via the runtime's `handleCueAction`. Snapshot semantics
 * matter — a handler may push another action onto the queue (re-entrancy
 * is rare but possible if a queued prop-anim cue triggers a cue chain),
 * and that pushback must not be drained in the same pass.
 */
export function drainPendingCues<T>(queue: T[]): T[] {
	return queue.splice(0, queue.length);
}
