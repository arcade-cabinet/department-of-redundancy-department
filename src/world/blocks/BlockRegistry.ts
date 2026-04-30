import { BLOCK_DEFS, type BlockDef, expandFaceUVs, type ToolAffinity } from './blocks';

/**
 * Stable mapping between block slug, numeric id, and runtime data. Block
 * ids are written into chunk Uint16Arrays and persisted to SQLite, so
 * the order of `BLOCK_DEFS` is part of the save-format contract — see
 * `blocks.ts` header.
 */

export type BlockSlug =
	| 'air'
	| 'carpet-floor'
	| 'ceiling-tile'
	| 'cubicle-wall'
	| 'drywall'
	| 'laminate-desk-block'
	| 'up-door-frame'
	| 'down-door-frame'
	| 'supply-closet-wall'
	| 'placed-stair-block'
	| 'placed-wall-block'
	| 'placed-desk-block'
	| 'placed-terminal';

export interface BlockEntry {
	id: number;
	slug: BlockSlug;
	solid: boolean;
	walkableTop: boolean;
	mineable: boolean;
	toolAffinity: ToolAffinity;
	faceUVs: ReturnType<typeof expandFaceUVs>;
}

function buildEntry(def: BlockDef, id: number): BlockEntry {
	return {
		id,
		slug: def.slug as BlockSlug,
		solid: def.solid,
		walkableTop: def.walkableTop,
		mineable: def.mineable,
		toolAffinity: def.toolAffinity,
		faceUVs: expandFaceUVs(def.faces),
	};
}

/** Numeric id keyed by slug. Air is always 0 (matches Uint16Array zero-init). */
export const BLOCK_IDS = Object.freeze(
	Object.fromEntries(BLOCK_DEFS.map((d, i) => [d.slug, i])) as Record<BlockSlug, number>,
);

/** Slug indexed by id (for debug + persistence round-trip). */
export const BLOCK_SLUGS: readonly BlockSlug[] = Object.freeze(
	BLOCK_DEFS.map((d) => d.slug as BlockSlug),
);

/** Full entry array indexed by id. */
export const BLOCK_REGISTRY: readonly BlockEntry[] = Object.freeze(
	BLOCK_DEFS.map((d, i) => buildEntry(d, i)),
);

const REGISTRY_BY_SLUG: ReadonlyMap<BlockSlug, BlockEntry> = new Map(
	BLOCK_REGISTRY.map((e) => [e.slug, e] as const),
);

export function getBlock(slug: BlockSlug): BlockEntry {
	const e = REGISTRY_BY_SLUG.get(slug);
	if (!e) throw new Error(`unknown block slug: ${slug}`);
	return e;
}

export function getBlockById(id: number): BlockEntry | undefined {
	return BLOCK_REGISTRY[id];
}
