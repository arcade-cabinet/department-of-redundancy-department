import { BLOCK_IDS, type BlockSlug, getBlock } from '@/world/blocks/BlockRegistry';
import type { ChunkData } from '@/world/chunk/ChunkData';

/**
 * Block-placement gate + mutator. Pure functions so unit tests cover
 * the rule logic without R3F:
 *
 *   - The target voxel must be air.
 *   - For non-floor blocks, the voxel directly below must be solid (a
 *     placed-stair-block or carpet-floor). Floor blocks have no support
 *     requirement (player can re-pave the floor anywhere walkable).
 *   - The player's bounding cell must not occupy the target voxel —
 *     can't place the block under your own feet.
 *
 * The runtime calls these against a (ChunkData, voxel-coords) pair
 * resolved from the camera-forward raycast in PRQ-11 T1 wiring.
 */

export interface VoxelCoord {
	x: number;
	y: number;
	z: number;
}

export type PlaceResult =
	| { ok: true }
	| { ok: false; reason: 'occupied' | 'no-support' | 'player-blocking' | 'invalid-slug' };

const FLOOR_BLOCKS = new Set<BlockSlug>([
	'carpet-floor',
	'placed-stair-block',
	'placed-desk-block',
]);

export interface PlaceContext {
	chunk: ChunkData;
	target: VoxelCoord;
	playerVoxel: VoxelCoord; // player's foot voxel
	slug: BlockSlug;
}

export function canPlace(ctx: PlaceContext): PlaceResult {
	const block = getBlock(ctx.slug);
	if (!block) return { ok: false, reason: 'invalid-slug' };

	const tx = ctx.target.x;
	const ty = ctx.target.y;
	const tz = ctx.target.z;
	const px = ctx.playerVoxel.x;
	const py = ctx.playerVoxel.y;
	const pz = ctx.playerVoxel.z;

	// Target must be air.
	if (ctx.chunk.get(tx, ty, tz) !== BLOCK_IDS.air) {
		return { ok: false, reason: 'occupied' };
	}

	// Player occupies foot voxel (py) and head voxel (py + 1). Reject
	// placement that intersects either.
	if (px === tx && pz === tz && (ty === py || ty === py + 1)) {
		return { ok: false, reason: 'player-blocking' };
	}

	// Non-floor blocks need support beneath.
	if (!FLOOR_BLOCKS.has(ctx.slug) && ty > 0) {
		const below = ctx.chunk.get(tx, ty - 1, tz);
		const belowBlock = block && getBlock(getSlugById(below));
		if (!belowBlock?.solid) {
			return { ok: false, reason: 'no-support' };
		}
	}

	return { ok: true };
}

/** Apply the placement. Mutates the chunk and marks it dirty so the
 *  renderer re-meshes + the navmesh host re-builds. Returns true if
 *  the write happened, false if `canPlace` rejected it. */
export function place(ctx: PlaceContext): boolean {
	if (!canPlace(ctx).ok) return false;
	const id = BLOCK_IDS[ctx.slug];
	if (id === undefined) return false;
	ctx.chunk.set(ctx.target.x, ctx.target.y, ctx.target.z, id);
	return true;
}

/** Lookup table id → slug; mirrors BLOCK_REGISTRY but typed for the
 *  slug-narrowing required above. */
function getSlugById(id: number): BlockSlug {
	for (const [slug, slugId] of Object.entries(BLOCK_IDS)) {
		if (slugId === id) return slug as BlockSlug;
	}
	return 'air';
}
