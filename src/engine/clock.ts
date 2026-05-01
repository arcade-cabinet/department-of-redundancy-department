// Engine clock facade. Per ts-browser-game profile, gameplay-path code that
// reads wall-clock time goes through here so a future deterministic-replay
// mode can swap in a frame-driven clock without touching call sites.
//
// v1: performance.now() passthrough. The engine's frame-drive scheduler is
// still authoritative for tick dt — this is for one-shot timestamping
// (animation start, shake start, cue fire times) where call sites currently
// reach for performance.now() directly.

export function now(): number {
	return performance.now();
}
