# PRQ-18: Performance Pass

**Status:** queued

**Blocked by:** PRQ-17.

## Goal

Audit and tighten every hot path against the spec §12 budgets. Instancing for repeated meshes, draw-call cap enforcement, GLB lazy-load per floor, KTX2 texture audit, FPS profiling on real iPhone 12. After this PRQ: alpha holds ≥45 fps on the iPhone 12 baseline through a full floor clear.

## Spec reference

§ 12 Performance budgets (locked), § 17 Open risks (and mitigation), § 19 §19.4 (perf bar).

## Success criteria

- Draw calls ≤ 250 mid-floor on mobile, ≤ 500 desktop. Verified via `<DrawCallHUD/>` and a Playwright spec that boots, plays 30s, and asserts.
- All static repeated meshes (cubicle walls, ceiling tiles, floor tiles, desks/cabinets/shelves) use `<Instances/>` from drei.
- Active point lights ≤ 8 mobile / ≤ 16 desktop (already from PRQ-02 — verify under stress).
- GLB lazy-load per floor: characters not on current floor unmounted from R3F tree.
- KTX2 audit: every texture ≥ 256² uses KTX2 if not already.
- HDRI loaded lazily once on first floor enter; cached.
- Heap ≤ 350 MB after 10-min play.
- Initial JS bundle gzip ≤ 350 KB (size-limit gate already enforced from PRQ-00).
- iPhone 12 (or `iPhone15,2` simulator with throttled CPU = 4× slowdown) sustains ≥45 fps for one full floor clear.

## Task breakdown

### T1: Instancing audit

**Files:** `src/render/world/InstancedBlocks.tsx`, `src/render/world/InstancedProps.tsx`.

Walk a floor; group identical meshes by GLB slug + material; replace per-instance `<mesh/>` with drei `<Instances/>` + `<Instance/>`. Critical for cubicle walls (could be 100+ per floor).

**Acceptance:** Draw call count drops measurably (browser test asserts ≤250 mid-floor).

### T2: Lazy character mount

**Files:** `src/render/characters/CharacterRoot.tsx`.

Listen to `current_floor` change → unmount characters from the previous floor (if any references retained), only mount characters on the current floor. Garbage-collect via R3F dispose hooks.

**Acceptance:** browser test: cycle floors 1↔2 ten times, heap should not grow unbounded.

### T3: HDRI lazy-load

**Files:** `src/render/lighting/Lighting.tsx` (extend).

Boot Landing without HDRI (use a simple sky color); load HDRI on first Game route enter; cache.

**Acceptance:** Network tab shows HDRI request only on first Game enter.

### T4: KTX2 audit

**Files:** `scripts/build-tileset.mjs` (extend), `scripts/convert-references.py` (extend export options).

Re-export tileset and HDRI textures as KTX2 where supported. Use `gltf-transform` for prop GLB textures to KTX2 via `pnpm dlx @gltf-transform/cli ktx`. Update vite config to register `ktx2` loader (`@react-three/drei` ships one).

**Acceptance:** post-pass GLBs visibly smaller; HDR loads faster.

### T5: BVH raycast cadence audit

**Files:** `src/ai/perception/los.ts` (cadence cap), `src/world/chunk/Chunk.ts`.

Confirm enemy LOS raycasts ≤ 5Hz per enemy; mining raycasts only on touch events; player tap raycast only on tap.

**Acceptance:** profile recording shows raycast budget < 1ms total.

### T6: iOS Simulator perf run

**Files:** `docs/qa/iphone-12-perf.md`.

Manual procedure: build native, run on iPhone 12 sim with 4× CPU throttle, play one floor clear, capture FPS via Safari Web Inspector. Document numbers.

**Acceptance:** ≥45 fps mean across 60s clear.

### T7: PR + merge

PR: `perf: instancing + lazy-load + KTX2 + raycast cadence (PRQ-18)`. Squash-merge after `validate-deployed` green.

## Notes

This is the final alpha-gate PRQ. After PRQ-18: §19 alpha DoD is satisfied. Promote the directive's `Alpha` section to `[x]` and unlock the Beta queue.
