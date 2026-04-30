# PRQ-03: Voxel/Chunk World

**Status:** queued

**Blocked by:** PRQ-02.

## Goal

Replace the static demo scene from PRQ-02 with a chunked voxel world: ChunkData (Uint16Array of block IDs), greedy-meshed instanced block faces, per-chunk three-mesh-bvh for raycasts, and a seeded floor generator that lays out cubicle banks + hallways + a supply closet + one Up-Door + one Down-Door per floor. After this PRQ: walking the camera through floor 1 reveals a generated office layout with proper navigation pinch-points.

## Spec reference

§ 1 (`src/world/`), § 4 (stairwells / Up-Down doors), § 12 (draw-call budget), § 19 (alpha visual + gameplay bars).

## Success criteria

- `ChunkData` stores block IDs in a single `Uint16Array(16*16*16)`. `BlockRegistry` registers all block types with face UVs into a tileset atlas.
- Greedy mesher coalesces same-block faces; per-chunk BVH built post-mesh.
- 16×16-cell floor generator produces deterministic layout from a `(seed, floor)` pair: 4–6 cubicle banks, perimeter hallway, 1 supply closet, 1 Up-Door, 1 Down-Door at distinct hallway termini, ≥3 desks per occupied cubicle.
- `<World/>` from PRQ-02 replaced by `<ChunkLayer chunks={...}/>` driven by the generator.
- Draw calls ≤ 250 mid-floor (verified by `<DrawCallHUD/>` debug overlay).
- Per-chunk BVH raycast roundtrip < 1ms in browser-tier benchmark.
- Floor visibly recognizable as an office: cubicle bank patterns, hallways, doors. Side-by-side vs PRQ-02 demo committed to `docs/qa/floor-1-generator.png`.

## Task breakdown

### T1: BlockRegistry + tileset

**Files:** `src/world/blocks/BlockRegistry.ts`, `src/world/blocks/blocks.ts`, `src/world/blocks/tileset.ts`. Plus a small tileset atlas at `public/assets/textures/blocks-tileset.webp` (assembled from PolyHaven textures via a small `scripts/build-tileset.mjs`).

Block types for alpha: `air`, `carpet-floor`, `ceiling-tile`, `cubicle-wall`, `drywall`, `laminate-desk-block`, `up-door-frame`, `down-door-frame`, `supply-closet-wall`, `placed-stair-block` (player-built), `placed-wall-block` (player-built), `placed-desk-block`, `placed-terminal`. Each has `solid: boolean`, `walkableTop: boolean`, `mineable: boolean`, `toolAffinity: 'paper'|'plastic'|'metal'|null`, `faceUVs: { px,nx,py,ny,pz,nz: [u,v] }`.

**Acceptance:** node test enumerates all block types, asserts each has every required property, and asserts tileset coverage.

### T2: ChunkData + greedy mesher

**Files:** `src/world/chunk/ChunkData.ts`, `src/world/chunk/greedyMesh.ts`, `src/world/chunk/Chunk.ts` (R3F component).

`ChunkData` constructor takes `Uint16Array(4096)` (16³). Methods: `get(x,y,z)`, `set(x,y,z,id)`, `markDirty()`, `dirty: boolean`. Greedy mesher walks the array per axis, coalescing same-block faces; outputs `{ positions, normals, uvs, indices }`. `<Chunk/>` builds a single `<bufferGeometry/>` + `<meshStandardMaterial map={tileset}/>` from the mesher output, applies `three-mesh-bvh` `computeBoundsTree()`.

**Acceptance:** node test: a chunk filled with `cubicle-wall` produces 6 quads (1 per cube face when AABB simplification kicks in). Browser test: chunk renders, BVH raycast finds the front face of a wall.

### T3: Seeded floor generator

**Files:** `src/world/generator/floor.ts`, `src/world/generator/rng.ts`, `src/world/generator/templates.ts`.

Mulberry32 PRNG seeded by `hash(seed, floor)`. Generator phases:
1. Allocate 16×16 grid of cells; mark perimeter as hallway, fill interior.
2. Carve 4–6 rectangular cubicle banks (3×3 to 5×5 cells), separated by 1-cell hallways.
3. Pick two distant hallway termini for Up-Door + Down-Door. Pick one bank-adjacent cell for the supply closet (3×3 cells).
4. Inside each cubicle bank: place desks (1–2 per cubicle) + chairs (1 per desk), align cubicle walls to grid.
5. Output `ChunkData[]` (4×4 chunks = 16×16 cells × 16 height).

**Acceptance:** `generateFloor(seed=0, floor=1)` returns a deterministic chunk array; same seed → same layout. Visual smoke test renders the floor and you can identify cubicle banks + hallways + doors.

### T4: `<ChunkLayer/>` mount

**Files:** `src/render/world/ChunkLayer.tsx`. Replace `<World/>` from PRQ-02.

Mounts `<Chunk/>` per `ChunkData` returned by the generator. View-distance cull: chunks with center > `viewDistance` from camera get unmounted (R3F handles dispose via `<Chunk/>` cleanup).

**Acceptance:** dev server shows the generated office; FPS budget held.

### T5: Draw-call HUD overlay

**Files:** `src/verify/DrawCallHUD.tsx`. Mounted under `?debug=draws`.

Hooks `gl.info.render.calls` per frame; renders top-right text overlay: `draws: NN, geom: NN, mem: NN MB`.

**Acceptance:** mid-floor reading ≤ 250 draws (mobile budget).

### T6: Per-chunk BVH raycast benchmark

**Files:** `src/world/chunk/Chunk.bench.browser.test.ts`.

Browser-tier vitest: build a chunk, run 1000 random raycasts, assert mean time < 1ms each.

**Acceptance:** green at desktop CI tier; mobile target measured separately in PRQ-18.

### T7: Up-Door / Down-Door visual stubs

**Files:** `src/render/world/Door.tsx`. Reads `up-door-frame` / `down-door-frame` block positions from chunks → renders door GLBs (we need a door prop GLB; if absent in references, use `Voxel_Props_Pack/Cabinet1` rotated as a placeholder until PRQ-12 ships the real Door component).

**Acceptance:** doors appear at the right cells; tap-stub logs `interact: up-door` (no transition logic yet — that's PRQ-12).

### T8: PR + merge

PR: `feat(world): chunked voxel world + seeded floor generator + per-chunk BVH (PRQ-03)`. Squash-merge after `validate-deployed` green.

## Notes

The generator's templates table (`generator/templates.ts`) is the only design-knob the agent will iterate on for layout feel. Keep templates data-driven — gameplay tuning post-alpha edits this file without touching the engine.
