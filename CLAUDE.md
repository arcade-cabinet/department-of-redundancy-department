@/Users/jbogaty/.claude/profiles/standard-repo.md
@/Users/jbogaty/.claude/profiles/ts-browser-game.md

# CLAUDE.md — Department of Redundancy Department

> Single foundation spec: [`docs/superpowers/specs/2026-04-29-dord-foundation-design.md`](./docs/superpowers/specs/2026-04-29-dord-foundation-design.md). Read it first.

## Identity

First-person voxel-prop FPS in an infinite procedural office. **DOOM meets Minecraft, in cubicles.** Mobile-first PWA, Capacitor-wrapped for native iOS/Android. Persistent SQLite world. R3F + drei + Rapier renderer.

## Critical context

### Single rendering pipeline

**R3F only.** No bare three.js scene mounts. No JollyPixel. No SolidJS.

### No animations

Characters export T-pose only; uniform shader-driven hop-walk locomotion. No `useAnimations`.

### No fog

Chunk culling gates draw distance. ACESFilmic + sRGB output.

### No virtual joysticks

Tap-to-travel + drag-look + tap-and-hold radial. Same input set on phone and desktop.

### Tech stack (locked in spec §2)

| Layer | Tech |
|---|---|
| Engine | three + @react-three/fiber + @react-three/drei + @react-three/rapier |
| Spatial | three-mesh-bvh |
| AI | yuka 0.7 |
| ECS | koota + koota/react |
| UI | radix-ui + framer-motion + tailwind 4 |
| Persistence | drizzle + @capacitor-community/sqlite (native) / sql.js + jeep-sqlite (web) |
| Settings | @capacitor/preferences |
| Mobile shell | Capacitor 8 |
| Bundler | Vite 8 |
| Lint | Biome 2.4 |
| Tests | Vitest 4 (node + browser via @vitest/browser-playwright) + Playwright 1.59 |
| Pkg | pnpm 10.33.0, node 22, TypeScript 6 |

## Common commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Vite dev |
| `pnpm typecheck` | tsc --noEmit |
| `pnpm lint` | biome check |
| `pnpm test:node` | vitest node |
| `pnpm test:browser` | vitest browser (real GPU) |
| `pnpm test:e2e:ci` | playwright |
| `pnpm assets:convert` | bpy: references → GLB |
| `pnpm assets:check` | manifest verifier |

## State split (spec §9)

- **Koota** — frame state (entity transforms, projectiles, AI handles).
- **drizzle / SQLite** — persistent (chunks, structures, journal, kills, recipes).
- **@capacitor/preferences** — settings KV.
- **`public/assets`, `public/content`** — static, never bundled.

## Project structure (spec §1)

- `app/` mounts React entry + views.
- `src/` is engine; never imports from `app/`.
- `public/` is fetched at runtime.
- `references/` is gitignored asset packs.
- `.agent-state/` is the autonomous loop's working memory.

## Workflows (spec §20)

Mean-streets parity: `ci.yml` (PR-only), `cd.yml` (push:main → Pages), `release.yml` (release-please + tag artifacts), `automerge.yml`. SHA-pinned actions. **DORD takes the lead on dep currency** — other arcade-cabinet repos catch up.

## Rendering rule

All visuals through R3F + drei. No bare three.js mounts. Use drei's `<Gltf/>` (or `useGLTF`) for all loaded models. Character meshes wrapped in `<Character slug="..."/>` (introduced in PRQ-07).

## RNG rule

- **No `Math.random()`** outside `node_modules/yuka/**`. Every random draw in DORD code goes through `createRng(seed)` from `src/world/generator/rng.ts` (the org-standard `Rng` interface, verbatim from mean-streets).
- **One entropy boundary** — `freshSeed()` is called once at new-game creation; the seed lives in `world_meta.seed` (spec §8) and drives every replay-relevant draw deterministically.
- **Two tracks**: gameplay (deterministic, scoped per consumer) + cosmetic (seeded once at boot from `crypto.getRandomValues()`, used for non-gameplay-visible jitter/sparkle).
- **Yuka exception**: yuka itself uses `Math.random()` internally for steering jitter / FSM tie-breaks. That's allowed — gameplay determinism is enforced at the *spawn placement* boundary, not at per-frame AI tick.

## Out of scope

See spec §16. No multiplayer, no skeletal animations, no viewmodel arms, no day/night, no outdoor biomes for alpha.
