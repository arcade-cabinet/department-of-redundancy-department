import type { BlockSlug } from '@/world/blocks/BlockRegistry';

/**
 * Pure mapper: radial menu option id → block slug to place.
 *
 * Why split: the radial options table (src/ui/radial/options.ts) is
 * UI-only data. The runtime needs a translation step from option id
 * to the place() argument. Keeping it pure + testable means new
 * placement options (M5+ traps, B0 weapon placements, etc.) can be
 * added without touching the radial UI or the place() core.
 *
 * Returns null for non-place ids (cancel, mine, etc.) — caller
 * routes those separately.
 */

const PLACE_ID_MAP: Readonly<Record<string, BlockSlug>> = Object.freeze({
	'place-stair': 'placed-stair-block',
	'place-wall': 'placed-wall-block',
	'place-desk': 'placed-desk-block',
	'place-terminal': 'placed-terminal',
});

export function radialIdToSlug(id: string): BlockSlug | null {
	return PLACE_ID_MAP[id] ?? null;
}
