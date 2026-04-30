import { slotUV, type TilesetSlot } from './tileset';

/**
 * Block-type catalogue for alpha. Each entry is a pure data row; the
 * registry in `BlockRegistry.ts` indexes these by stable numeric id.
 *
 * Adding a block:
 *   1. Append to BLOCK_DEFS (NEVER reorder — ids are persisted to SQLite
 *      via spec §8 chunks.dirty_blob).
 *   2. Reference an existing TilesetSlot or add a new slot to
 *      `tileset.ts` (and re-run scripts/build-tileset.mjs).
 *
 * Removing a block: don't. Mark it deprecated and stop spawning it. A
 * removal would shift ids and corrupt every saved chunk.
 */

export type ToolAffinity = 'paper' | 'plastic' | 'metal' | null;

/**
 * Per-face slot picks. Two shapes:
 *   - shorthand: `{ all }` (every face) plus optional `py`/`ny` overrides
 *     for blocks where the cap/bottom differ from the sides (door frames,
 *     terminals — the top is laminate trim, the sides are the body).
 *   - explicit: every face named, used when no two faces share a slot.
 */
export type FacePicks =
	| { all: TilesetSlot; py?: TilesetSlot; ny?: TilesetSlot }
	| {
			px: TilesetSlot;
			nx: TilesetSlot;
			py: TilesetSlot;
			ny: TilesetSlot;
			pz: TilesetSlot;
			nz: TilesetSlot;
	  };

export interface BlockDef {
	slug: string;
	solid: boolean;
	walkableTop: boolean;
	mineable: boolean;
	toolAffinity: ToolAffinity;
	faces: FacePicks;
}

export const BLOCK_DEFS: BlockDef[] = [
	{
		slug: 'air',
		solid: false,
		walkableTop: false,
		mineable: false,
		toolAffinity: null,
		faces: { all: 'air' },
	},
	{
		slug: 'carpet-floor',
		solid: true,
		walkableTop: true,
		mineable: true,
		toolAffinity: 'paper',
		faces: { all: 'carpet' },
	},
	{
		slug: 'ceiling-tile',
		solid: true,
		walkableTop: false,
		mineable: true,
		toolAffinity: 'paper',
		faces: { all: 'ceiling-tile' },
	},
	{
		slug: 'cubicle-wall',
		solid: true,
		walkableTop: false,
		mineable: true,
		toolAffinity: 'paper',
		faces: { all: 'cubicle-wall' },
	},
	{
		slug: 'drywall',
		solid: true,
		walkableTop: false,
		mineable: true,
		toolAffinity: 'plastic',
		faces: { all: 'drywall' },
	},
	{
		slug: 'laminate-desk-block',
		solid: true,
		walkableTop: true,
		mineable: true,
		toolAffinity: 'plastic',
		faces: { all: 'laminate' },
	},
	{
		slug: 'up-door-frame',
		solid: false, // walkable through; gameplay collider lives elsewhere
		walkableTop: false,
		mineable: false,
		toolAffinity: null,
		faces: { all: 'door-frame', py: 'laminate', ny: 'laminate' },
	},
	{
		slug: 'down-door-frame',
		solid: false,
		walkableTop: false,
		mineable: false,
		toolAffinity: null,
		faces: { all: 'door-frame', py: 'laminate', ny: 'laminate' },
	},
	{
		slug: 'supply-closet-wall',
		solid: true,
		walkableTop: false,
		mineable: true,
		toolAffinity: 'metal',
		faces: { all: 'supply-metal' },
	},
	{
		slug: 'placed-stair-block',
		solid: true,
		walkableTop: true,
		mineable: true,
		toolAffinity: 'plastic',
		faces: { all: 'placed-stair' },
	},
	{
		slug: 'placed-wall-block',
		solid: true,
		walkableTop: false,
		mineable: true,
		toolAffinity: 'plastic',
		faces: { all: 'placed-wall' },
	},
	{
		slug: 'placed-desk-block',
		solid: true,
		walkableTop: true,
		mineable: true,
		toolAffinity: 'plastic',
		faces: { all: 'placed-desk' },
	},
	{
		slug: 'placed-terminal',
		solid: true,
		walkableTop: false,
		mineable: true,
		toolAffinity: 'metal',
		faces: { all: 'placed-terminal', py: 'laminate', ny: 'laminate' },
	},
];

/** Expand FacePicks shorthand to per-face UV origins. */
export function expandFaceUVs(faces: FacePicks): {
	px: [number, number];
	nx: [number, number];
	py: [number, number];
	ny: [number, number];
	pz: [number, number];
	nz: [number, number];
} {
	if ('px' in faces) {
		return {
			px: slotUV(faces.px),
			nx: slotUV(faces.nx),
			py: slotUV(faces.py),
			ny: slotUV(faces.ny),
			pz: slotUV(faces.pz),
			nz: slotUV(faces.nz),
		};
	}
	const allUV = slotUV(faces.all);
	return {
		px: allUV,
		nx: allUV,
		py: faces.py ? slotUV(faces.py) : allUV,
		ny: faces.ny ? slotUV(faces.ny) : allUV,
		pz: allUV,
		nz: allUV,
	};
}
