# PRQ-02: Render Core

**Status:** queued

**Blocked by:** PRQ-01.

## Goal

Replace the placeholder cube from PRQ-00 with the locked render configuration: HDRI environment, RectAreaLight ceiling banks, culled desk-lamp point lights, ACESFilmic tonemap, sRGB output, NO fog. Render one floor-tile + one ceiling-tile + one cubicle-bank + one `middle-manager` GLB to prove the full visual stack end-to-end. After this PRQ: a single static scene visibly **exceeds** `references/poc.html` on every visual axis.

## Spec reference

§ 6 Lighting (locked, no fog), § 11 Brand tokens, § 19 Alpha DoD §19.1 (visual bar).

## Success criteria

- `<Lighting/>` provides Environment HDRI + DirectionalLight + per-bank RectAreaLight + per-cubicle pointLight, with point lights culled to ≤ 8 mobile / ≤ 16 desktop by camera distance.
- `<World/>` renders one carpet-textured floor tile (4×4 cubicle), one ceiling-tile mesh, four laminate cubicle walls, one desk (Voxel_Props_Pack desk GLB), one chair, and one `middle-manager` GLB standing at the desk.
- ACESFilmic tonemap, exposure 1.0, output `SRGBColorSpace`. No `scene.fog`.
- Side-by-side screenshot vs `references/poc.html` shows obvious quality gap (committed to `docs/qa/render-core-vs-poc.png`).
- `pnpm test:browser` covers Lighting cull-by-distance + Environment-loaded smoke.
- Visual regression snapshot test in `e2e/render-core.spec.ts` baselined.

## Task breakdown

### T1: `<Lighting/>` component (`src/render/lighting/Lighting.tsx`)

Mounts `<Environment files="/assets/hdri/<slug>.hdr" intensity={0.6}/>`, one `<directionalLight position={[20,30,10]} intensity={0.4} color="#E8ECEE" castShadow shadow-mapSize={[2048,2048]} shadow-bias={-0.0005}/>`. Configures renderer via R3F `gl` prop: `toneMapping: ACESFilmicToneMapping`, `toneMappingExposure: 1.0`, `outputColorSpace: SRGBColorSpace`.

**Acceptance:** browser test asserts `scene.environment !== null` post-mount; `gl.toneMapping === ACESFilmicToneMapping`.

### T2: `<CeilingFixture/>` RectAreaLight bank

**Files:** `src/render/lighting/CeilingFixture.tsx`.

`<rectAreaLight width={4} height={1.2} intensity={1.4} color="#F4F1EA" position=...>`. Helper component places fixtures along a cubicle bank's row at +Y ceiling height. Uses `RectAreaLightUniformsLib` (drei's `<Sphere/>` ceiling-diffuser hint optional).

**Acceptance:** placing 3 fixtures in a row produces visibly lit ground beneath each, no light bleed across banks.

### T3: `<DeskLamp/>` culled pointLight

**Files:** `src/render/lighting/DeskLamp.tsx`, `src/render/lighting/PointLightCuller.ts`.

Each desk lamp is a `<pointLight intensity={0.8} distance={4} color="#FFD9A0"/>`. The culler runs each frame: sorts active lamps by camera distance, leaves only the top N enabled (`N=8` mobile per-tier from preferences; default 16 desktop). Disabled lamps set `intensity={0}` (no remount).

**Acceptance:** node test for culler ranking; browser test asserts only N lights are non-zero with N+M lamps in scene.

### T4: `<World/>` static scene + textured ground

**Files:** `src/render/world/World.tsx`, `src/render/world/Floor.tsx`, `src/render/world/Ceiling.tsx`, `src/render/world/CubicleBank.tsx`.

Floor: `<mesh receiveShadow>` w/ `<planeGeometry args={[16, 16]}/>` + carpet texture (albedo + normal + roughness loaded via drei `useTexture`). Ceiling: same plane mirrored with ceiling-tile texture. Cubicle bank: 2×2 group of 4 cubicles, walls = `<boxGeometry>` w/ laminate texture, partition height 1.2u. One desk GLB + one chair GLB + one `middle-manager` GLB at desk 0.

**Acceptance:** `pnpm dev` shows the scene rendered without warnings.

### T5: `<Character slug="..."/>` minimal mount (full version in PRQ-07)

**Files:** `src/render/characters/Character.tsx`.

For PRQ-02 only: read `manifest.json` for the slug, `useGLTF(manifest[slug].path)`, mount `<primitive object={scene.clone()}/>` at given position. No locomotion yet. Used by `World.tsx` to place the `middle-manager`.

**Acceptance:** middle-manager GLB visible in scene at desk position.

### T6: Goalpost screenshot test

**Files:** `e2e/render-core.spec.ts` (visual snapshot). `docs/qa/render-core-vs-poc.png` (manual side-by-side committed).

Playwright navigates to a `?scene=demo` route that mounts `<World/>` + `<Lighting/>` static, takes a screenshot at 1280×720, asserts <2% pixel diff against `e2e/__snapshots__/render-core.png`. Manual side-by-side diff vs `references/poc.html` rendered the same way.

**Acceptance:** snapshot baselined; the side-by-side committed to QA dir is visibly cleaner than the POC (no fog, real textures, real GLB character).

### T7: Vitest browser tests for Lighting

**Files:** `src/render/lighting/Lighting.browser.test.tsx`, `PointLightCuller.test.ts`.

Browser test: mount `<Canvas><Lighting/></Canvas>`; assert renderer's `outputColorSpace === SRGBColorSpace`, `toneMapping === ACESFilmicToneMapping`. Node test: `cullByDistance([...8 lamps], camera, maxN=4)` returns expected sort.

**Acceptance:** all green.

### T8: PR + merge

PR: `feat(render): R3F core (HDRI + RectArea + culled pointLights + first GLB) (PRQ-02)`. Squash-merge after `validate-deployed` green.

## Notes

This PRQ is the visual-bar gate. If `validate-deployed` doesn't show a screenshot that's *obviously* better than the POC, do not merge — open a fix-forward PR until it does.
