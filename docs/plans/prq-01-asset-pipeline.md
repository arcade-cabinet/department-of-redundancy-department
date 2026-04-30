# PRQ-01: Asset Pipeline

**Status:** queued

**Blocked by:** PRQ-00.

## Goal

Stand up the bpy-based asset conversion pipeline that turns `references/unpacked/**/*.{gltf,obj,dae}` into `public/assets/models/{characters,props,traps}/*.glb` with a `manifest.json` index. Fetch indoor warehouse/office HDRI + supporting PolyHaven textures into `public/assets/{hdri,textures}/`. After this PRQ: every roster slug from spec §3.4 + §21 has a real GLB on disk, the manifest references it, and `pnpm assets:check` is enforcing.

## Spec reference

`docs/superpowers/specs/2026-04-29-dord-foundation-design.md` §3 (asset pipeline + roster + no animations), §21 (Gojo + Hitman_obj addendum), §6 (lighting — HDRI requirement).

## Success criteria

- `scripts/convert-references.py` runs under `blender --background --python` with `--idempotent` flag; re-running on unchanged inputs is a no-op (manifest `sourceHash` match).
- `scripts/convert-references.config.json` declares every roster slug with explicit source path + scale + footprint + tags.
- Smart source picker prefers GLTF when present, else OBJ + MTL + PNG when available (skip atlas-bake), else DAE + per-bone PNGs (with Cycles bake to a 256² atlas). Animation tracks always stripped on export.
- `public/assets/models/manifest.json` schema matches spec §3.3.
- `public/assets/hdri/indoor-warehouse-2k.hdr` and the carpet/ceiling-tile/laminate/drywall/whiteboard textures exist via `scripts/fetch-polyhaven.mjs`.
- `pnpm assets:check` fails if any manifest slug points to a missing GLB; passes when all are present.
- Total GLB weight ≤ 12 MB (spec §12). HDRI ≤ 4 MB.
- Roster fully populated: `middle-manager`, `policeman`, `hitman`, `swat`, `hr-reaper`, 8 props (incl. `staircase-1`, `staircase-2`), 51 traps. (`swat-squad` reuses `swat` GLB.)

## Task breakdown

### T1: bpy script skeleton + smart source picker

**Files:** `scripts/convert-references.py`, `scripts/convert-references.config.json`.

Implement scene-clean → import-by-extension (`.gltf` / `.obj` / `.dae`) → apply transforms → origin-to-base-bounds → export GLB (WEBP textures embedded, `export_animations=False`). Source picker: scan candidates per slug, score = `100*anim + 10*tex + 5*bones + 3*meshes + 2*emissive + format_pref`, but **drop the `100*anim` term to zero** (we strip anims anyway, so they should not bias the choice) and **prefer OBJ+MTL+PNG over DAE+per-bone when present** (saves the bake step) per spec §21. Idempotency via SHA-256 of (input bytes + script version + per-slug options).

**Acceptance:** running `pnpm assets:convert` on `middle-manager` (Kento GLTF) produces `public/assets/models/characters/middle-manager.glb` and updates `manifest.json`. Re-running prints `SKIP middle-manager (hash match)` and exits in <1s.

### T2: DAE atlas-bake path (Cycles)

**Files:** `scripts/convert-references.py` (atlas-bake function).

For DAE sources with sidecar per-bone diffuse + emissive PNGs: build a Cycles bake target (256² combined, diffuse + emissive channels), bake each bone's material onto the atlas via UV island packing, replace material chain on the merged mesh with a single principled BSDF using the atlas. Apply to `policeman`, `swat`, `hr-reaper` (which is the SWAT base with a vertex-color tint pass — see T4).

**Acceptance:** `policeman.glb` ≤ 350KB; opening it in https://gltf-viewer.donmccurdy.com (or `pnpm dlx @gltf-transform/cli inspect`) shows one mesh, one material, one 256² texture, no skeletal data.

### T3: OBJ-preferred path for `hitman`

**Files:** `scripts/convert-references.config.json` entry `hitman: { src: "Hitman_obj/Hitman_T_Pose.obj" }`.

Source picker selects OBJ here (spec §21 rule). Import OBJ + MTL → already has unified diffuse PNG → no bake needed → export GLB.

**Acceptance:** `hitman.glb` ≤ 200KB; manifest tag includes `tier-1.5`.

### T4: HR Reaper variant (tinted SWAT)

**Files:** `scripts/convert-references.py` (vertex-color tint pass), `convert-references.config.json` entry `hr-reaper: { src: <swat>, scale: 1.5, tint: "#E0A33C" }`.

Import the swat output, apply vertex-color multiply with the auditor-amber color, scale 1.5×, export as new slug.

**Acceptance:** `hr-reaper.glb` distinct from `swat.glb` by hash; visible amber tint in viewer.

### T5: Props pack conversion (8 GLTFs + 2 OBJ staircases)

**Files:** `convert-references.config.json` (8 GLTF prop entries + `staircase-1`, `staircase-2`).

Direct GLTF re-export for props (origin-to-base, scale 1.0). OBJ-import for staircases (already have unified texture). Each entry declares `footprintCells` matching the chunk-grid (desk `[2,1,1]`, cabinet `[1,2,1]`, shelves `[1,3,1]`, lamp `[1,2,1]`, bench `[2,1,1]`, bookcase `[1,3,1]`, box `[1,1,1]`, treasure-chest `[1,1,1]`, staircase-1 `[1,3,2]`, staircase-2 `[2,3,2]`).

**Acceptance:** all 10 prop GLBs land in `public/assets/models/props/`. Combined ≤ 1.5 MB.

### T6: Trap pack conversion (51 GLTFs)

**Files:** `convert-references.config.json` (auto-generated entries via a `--scan` step in the bpy script that lists `references/unpacked/Trap_Pack_Upload/**/*.gltf` and emits a config block — committed by hand).

Each trap → GLB with `tags: ["trap", "<sub-tag>"]` where sub-tag groups visual variants (`shredder`, `fax-mortar`, `sprinkler`, `printer-turret`, `spike`, etc. — five buckets, mapped by hand using the trap-pack image previews).

**Acceptance:** all 51 trap GLBs land in `public/assets/models/traps/`. Combined ≤ 4 MB.

### T7: PolyHaven fetch script

**Files:** `scripts/fetch-polyhaven.mjs`.

Idempotent fetcher hitting `polyhaven.com` API. Pulls one HDRI (`indoor_warehouse` or `museum_office_2k` — pick the most office-like; resolve at runtime by category=`indoor` + tag scoring). Pulls 5 textures: `worn_carpet_diffuse_2k`, `acoustic_ceiling_tile_2k`, `wood_laminate_2k`, `painted_drywall_2k`, `whiteboard_2k` (or the closest equivalents present in the API). Writes each to `public/assets/{hdri,textures}/<slug>/<slug>_{albedo,normal,roughness,...}.{webp,hdr}`. Skips on hash match.

**Acceptance:** running `pnpm dlx node scripts/fetch-polyhaven.mjs` populates `public/assets/hdri/` (1 .hdr ≤4 MB) and `public/assets/textures/` (5 sets).

### T8: `assets:check` enforcement

**Files:** `scripts/check-asset-manifest.mjs` (replace stub from PRQ-00).

Verify every manifest slug's `path` resolves to an existing file under `public/`. Verify total GLB size ≤ 12 MB and HDRI ≤ 4 MB (spec §12). Print a coverage table per group.

**Acceptance:** `pnpm assets:check` exits 0 on full manifest; exits 1 if any slug's GLB is removed.

### T9: Wire to vite predev/prebuild

**Files:** `package.json` (`predev`/`prebuild` already chain it from PRQ-00 — verify).

Confirm `pnpm dev` and `pnpm build` both fail-fast when manifest is incomplete.

**Acceptance:** removing one GLB and running `pnpm build` halts at the assets:check step with a useful error.

### T10: Vitest browser smoke for GLB load

**Files:** `src/render/characters/loadGlb.browser.test.tsx`.

A single browser-tier test: mount `<Canvas/>` with drei's `useGLTF('/assets/models/characters/middle-manager.glb')`, wait for ready, assert `scene.children.length > 0`. This guards against malformed GLB output from the bpy pipeline.

**Acceptance:** `pnpm test:browser` 1/1 green.

### T11: PR + merge

Commit-by-task with parallel reviewer trio. PR title: `feat(assets): bpy conversion pipeline + manifest + PolyHaven fetch (PRQ-01)`. Squash-merge after CI green and `validate-deployed` green on `main`.

**Acceptance:** `cd.yml` deploys live with the manifest + GLBs intact; `pnpm assets:check` against the live `dist/` works.

## Notes

The bpy script must run on the dev's local Blender (no CI requirement to install Blender). `pnpm assets:convert` is **manual** (run when references change). Output GLBs + manifest are committed to git via LFS (LFS rules already in `.gitattributes` from PRQ-00).
