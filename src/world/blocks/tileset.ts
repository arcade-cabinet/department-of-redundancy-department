/**
 * Tileset atlas layout for voxel block faces.
 *
 * The atlas is a 4×4 grid of 256×256 tiles packed into a single 1024×1024
 * webp at `public/assets/textures/blocks-tileset.webp`. Each tile is keyed
 * by `TilesetSlot` and its UV origin is computed deterministically from
 * the `TilesetSlot`'s row/col so block face UVs in `BlockRegistry` stay
 * data-driven.
 *
 * Why one atlas: chunked voxel meshing wants ONE material per chunk so we
 * can hit the spec §12 draw-call budget. Per-block-type materials would
 * blow that out instantly.
 *
 * The atlas is *generated* by `scripts/build-tileset.mjs` from the
 * PolyHaven Diffuse maps already on disk in `public/assets/textures/`,
 * downsampled and arranged per the slot map below. UVs here MUST match
 * that script's output — both reference `TILESET_GRID`.
 */

export const TILESET_GRID = 4 as const; // 4×4 = 16 slots
export const TILESET_TILE_COUNT = TILESET_GRID * TILESET_GRID;
export const TILESET_TILE_SIZE_PX = 256;
export const TILESET_PX = TILESET_GRID * TILESET_TILE_SIZE_PX; // 1024
export const TILESET_PATH = '/assets/textures/blocks-tileset.webp';

/**
 * Slot keys are *texture identities* (carpet, drywall, etc.), not block
 * types. Multiple block types can share a slot — `up-door-frame` and
 * `down-door-frame` both use `drywall` walls with a `laminate` lintel,
 * for instance.
 *
 * The grid position determines the tile's (col, row) inside the atlas.
 * Adding a new slot: append to this array — never reorder, since
 * pre-built atlases on user devices key on these positions.
 */
export const TILESET_SLOTS = [
	'air', // index 0: transparent black (unused at render time, present for symmetry)
	'carpet',
	'ceiling-tile',
	'cubicle-wall', // mid-grey acoustic-panel weave (synth)
	'drywall',
	'laminate',
	'whiteboard',
	'door-frame', // off-white painted-trim (synth)
	'supply-metal', // brushed-metal (synth)
	'placed-stair', // bright safety-yellow (synth, easy to spot in QA)
	'placed-wall', // off-white concrete (reuse drywall)
	'placed-desk', // dark laminate (reuse laminate)
	'placed-terminal', // CRT-screen blue-glow (synth)
	'reserved-13',
	'reserved-14',
	'reserved-15',
] as const;

export type TilesetSlot = (typeof TILESET_SLOTS)[number];

const SLOT_INDEX = new Map<TilesetSlot, number>(TILESET_SLOTS.map((s, i) => [s, i] as const));

/**
 * UV origin (lower-left corner) of a slot inside the [0,1]² atlas.
 * Three.js UVs are origin-bottom-left so row 0 is the *bottom* row of
 * the atlas image — matching what `build-tileset.mjs` writes.
 */
export function slotUV(slot: TilesetSlot): [number, number] {
	const idx = SLOT_INDEX.get(slot);
	if (idx === undefined) throw new Error(`unknown tileset slot: ${slot}`);
	const col = idx % TILESET_GRID;
	const row = Math.floor(idx / TILESET_GRID);
	return [col / TILESET_GRID, row / TILESET_GRID];
}

export const TILESET_TILE_UV_SIZE = 1 / TILESET_GRID;
