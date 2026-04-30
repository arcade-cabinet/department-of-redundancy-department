/**
 * Per-character-slug visual + audio tier metadata. `<Character/>` reads
 * the entry to set its overall scale + cue PRQ-15 audio on spawn.
 *
 * Spec §3.4 roster: middle-manager, policeman, swat, hitman,
 * hr-reaper. Each has a tier-coded scale so power reads at-a-glance —
 * the HR Reaper boss is intentionally smaller-than-human-but-scaled-up
 * to read as uncanny.
 *
 * Audio cue slugs are placeholders the PRQ-15 audio system maps to
 * loaded SFX files. They never play here.
 */

export interface TierStyle {
	/** Multiplier on the manifest's per-character scale. 1.0 = no change. */
	scale: number;
	/** Walk speed in world-units/sec the AI default-paces at. */
	walkSpeed: number;
	/** PRQ-15 audio cue slug fired on spawn. */
	audioCueOnSpawn: string;
}

const TIER_TABLE: Readonly<Record<string, TierStyle>> = Object.freeze({
	'middle-manager': { scale: 1.0, walkSpeed: 1.6, audioCueOnSpawn: 'manager-spawn' },
	policeman: { scale: 1.1, walkSpeed: 2.2, audioCueOnSpawn: 'police-spawn' },
	swat: { scale: 1.0, walkSpeed: 2.6, audioCueOnSpawn: 'swat-spawn' },
	hitman: { scale: 1.4, walkSpeed: 3.2, audioCueOnSpawn: 'hitman-spawn' },
	'hr-reaper': { scale: 1.5, walkSpeed: 3.0, audioCueOnSpawn: 'reaper-spawn' },
});

export function tierStyleFor(slug: string): TierStyle | null {
	return TIER_TABLE[slug] ?? null;
}

export function knownTierSlugs(): readonly string[] {
	return Object.keys(TIER_TABLE);
}
