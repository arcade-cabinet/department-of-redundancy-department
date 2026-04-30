import { type BlockSlug, getBlockById } from '@/world/blocks/BlockRegistry';

/**
 * Surface kind drives the radial menu's option set (RadialMenu.tsx →
 * options.ts). Each kind matches a list of contextual actions; e.g.,
 * 'floor' lets you place a structure or call a friendly NPC over,
 * 'wall-world' lets you mine, 'wall-placed' lets you mine OR repair.
 *
 * The classifier looks at *what* the player tapped on:
 *   - For voxel hits: read the block id, map slug → SurfaceKind.
 *   - For non-voxel entity hits: read a `surfaceTag` koota component
 *     attached to the entity (added when the entity is spawned —
 *     PRQ-08 enemies, PRQ-12 stairwell doors, etc.).
 */

export type SurfaceKind =
	| 'floor'
	| 'wall-world'
	| 'wall-placed'
	| 'desk'
	| 'terminal'
	| 'printer'
	| 'door'
	| 'enemy';

const BLOCK_TO_SURFACE: Partial<Record<BlockSlug, SurfaceKind>> = {
	'carpet-floor': 'floor',
	'cubicle-wall': 'wall-world',
	drywall: 'wall-world',
	'supply-closet-wall': 'wall-world',
	'placed-wall-block': 'wall-placed',
	'placed-stair-block': 'wall-placed', // mining a placed stair = same option set
	'laminate-desk-block': 'desk',
	'placed-desk-block': 'desk',
	'placed-terminal': 'terminal',
	'up-door-frame': 'door',
	'down-door-frame': 'door',
	// 'ceiling-tile' and 'air' have no meaningful actions — left out so
	// callers fall through to `null` (don't open a radial).
};

/** Hit kind hint from the raycaster. The renderer tags meshes with their
 *  origin so the classifier can pick the right resolution path. */
export interface VoxelHit {
	kind: 'voxel';
	blockId: number;
}

export interface EntityHit {
	kind: 'entity';
	tag: SurfaceKind;
}

export type SurfaceHit = VoxelHit | EntityHit;

/** Returns the surface kind for a hit, or `null` if no radial should
 *  open (e.g. the player tapped on the ceiling tile or an air block,
 *  or hit nothing at all). */
export function classifySurface(hit: SurfaceHit | null): SurfaceKind | null {
	if (!hit) return null;
	if (hit.kind === 'entity') return hit.tag;
	const block = getBlockById(hit.blockId);
	if (!block) return null;
	return BLOCK_TO_SURFACE[block.slug] ?? null;
}
