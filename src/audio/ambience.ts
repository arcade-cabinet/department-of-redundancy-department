/**
 * Threat-tier ambience layering (PRQ-B4, M5). Pure data: caller passes
 * the live threat scalar, gets back the active layer slugs in
 * priority order. AudioBackground from PRQ-15 will play each layer at
 * the same time with crossfade between threat-tier transitions.
 *
 * Spec §22.2: "managers-only → adds radio chatter at threat≥2 → adds
 * boots-thump at threat≥5 → adds tense drone at threat≥8".
 */

export type AmbienceLayer = 'managers-only' | 'radio-chatter' | 'boots-thump' | 'tense-drone';

const ALL: readonly AmbienceLayer[] = [
	'managers-only',
	'radio-chatter',
	'boots-thump',
	'tense-drone',
];

export function ambienceForThreat(threat: number): AmbienceLayer[] {
	const out: AmbienceLayer[] = ['managers-only'];
	if (threat >= 2) out.push('radio-chatter');
	if (threat >= 5) out.push('boots-thump');
	if (threat >= 8) out.push('tense-drone');
	return out;
}

export function ambienceLayers(): readonly AmbienceLayer[] {
	return ALL;
}
