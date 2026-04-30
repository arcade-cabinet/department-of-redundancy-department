import { BLOCK_IDS, type BlockEntry, type BlockSlug, getBlock } from '@/world/blocks/BlockRegistry';
import type { ChunkData } from '@/world/chunk/ChunkData';
import type { VoxelCoord } from './place';

/**
 * Mining timing + mutation. Spec §11:
 *   - mining time = `block.baseTime / tool.affinityMultiplier`
 *   - matching tool = full speed; non-matching tool = 4× slower
 *   - non-mineable blocks reject (carpet-floor, ceiling-tile pre-alpha,
 *     air, door-frames as gameplay barriers)
 *
 * Drop rolling lives in dropTables.ts; the runtime composes:
 *   1. startMine(target) → ms timer kicks off
 *   2. completeMine(target) → ChunkData.set(.., air); rollDrops; add to
 *      inventory.
 */

export interface ToolKind {
	affinity: 'paper' | 'plastic' | 'metal' | 'any';
}

const NON_MATCHING_MULTIPLIER = 0.25; // 4× slower
const BASE_TIME_MS = 800;

export interface MineCheck {
	ok: boolean;
	reason?: 'air' | 'not-mineable' | 'invalid-coord';
	/** Time required to mine the block, in milliseconds. */
	timeMs?: number;
	/** The mined block (for drop-table lookup). */
	block?: BlockEntry;
}

export function checkMine(chunk: ChunkData, target: VoxelCoord, tool: ToolKind): MineCheck {
	let id: number;
	try {
		id = chunk.get(target.x, target.y, target.z);
	} catch {
		return { ok: false, reason: 'invalid-coord' };
	}
	if (id === BLOCK_IDS.air) return { ok: false, reason: 'air' };
	const block = getBlock(slugFromId(id));
	if (!block?.mineable) return { ok: false, reason: 'not-mineable' };

	// Tool affinity: matching = 1×, non-matching = 4× slower. 'any'
	// (e.g. dev cheat) always full speed.
	const matches =
		tool.affinity === 'any' || (block.toolAffinity != null && tool.affinity === block.toolAffinity);
	const multiplier = matches ? 1 : NON_MATCHING_MULTIPLIER;
	const timeMs = BASE_TIME_MS / multiplier;
	return { ok: true, timeMs, block };
}

/** Apply the mine: replace target with air, mark chunk dirty. Returns
 *  the slug of the mined block (caller looks up the drop table). */
export function completeMine(chunk: ChunkData, target: VoxelCoord): BlockSlug | null {
	const check = chunk.get(target.x, target.y, target.z);
	if (check === BLOCK_IDS.air) return null;
	const slug = slugFromId(check);
	chunk.set(target.x, target.y, target.z, BLOCK_IDS.air);
	return slug;
}

function slugFromId(id: number): BlockSlug {
	for (const [slug, slugId] of Object.entries(BLOCK_IDS)) {
		if (slugId === id) return slug as BlockSlug;
	}
	return 'air';
}
