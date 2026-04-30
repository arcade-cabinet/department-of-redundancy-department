---
title: Architecture
updated: 2026-04-30
status: current
domain: technical
---

# Architecture

DORD is a **mobile-first arcade rail shooter** in the Time Crisis / House of the Dead / Virtua Cop lineage. This file is a thin pointer to canon. Read the canon first.

## Source of truth

- **Design canon (12 docs):** [`docs/superpowers/specs/arcade-rail-shooter/`](./superpowers/specs/arcade-rail-shooter/)
  - `00-overview.md` · `01-pacing-and-time-math.md` · `02-encounter-vocabulary.md` · `03-difficulty-and-modifiers.md`
  - `levels/01-lobby.md` … `levels/08-boardroom.md`
- **Top-level design doc:** [`docs/superpowers/specs/2026-04-30-arcade-rail-shooter-design.md`](./superpowers/specs/2026-04-30-arcade-rail-shooter-design.md)
- **Build plan / PRQ ledger:** [`docs/superpowers/plans/2026-04-30-arcade-rail-shooter-build.md`](./superpowers/plans/2026-04-30-arcade-rail-shooter-build.md)

## Layers

| Layer | Tech | Module |
|---|---|---|
| Engine | three + @react-three/fiber + @react-three/drei + @react-three/rapier | `src/engine/` |
| Rail (camera path) | hand-authored `RailNode` graph + lerp + pitch/yaw | `src/rail/` |
| Encounter | beat handlers + position runner + reticle 3-state | `src/encounter/` |
| Combat | hitscan + weapon stats + justice-shot detection | `src/combat/` |
| Score | body / head / justice / civilian + combo cap + difficulty | `src/score/` |
| Levels | hand-crafted level data (8 floors + boss arena) | `src/levels/` |
| ECS | koota | within engine |
| Spatial | three-mesh-bvh | within render layer |
| Audio | Web Audio + curated 66-file library | `src/audio/` |
| Persistence | drizzle + sql.js (web) / @capacitor-community/sqlite (native) | `src/db/` |
| Settings | @capacitor/preferences | within shell |
| UI | radix-ui + framer-motion + tailwind 4 | `src/ui/` |
| Mobile shell | Capacitor 8 | `app/shell/` |

## State split

- **Koota** — frame state (entity transforms, projectiles, AI handles).
- **drizzle / SQLite** — persistent (high scores, daily challenge results, unlocks).
- **@capacitor/preferences** — settings KV.
- `public/assets`, `public/content` — static, never bundled.

## Rendering rule

R3F + drei only. No bare three.js mounts. Use drei's `<Gltf/>` (or `useGLTF`) for all loaded models. Character meshes wrapped in `<Character slug="..."/>`.

## RNG rule

No `Math.random()` outside `node_modules/yuka/**`. Every random draw goes through `createRng(seed)` from `src/shared/rng.ts`. One entropy boundary per run (daily challenge uses UTC-date-seeded; normal runs use `freshSeed()` at run-start).

## Memory dispose discipline

Pattern from commit 577eb2c (canon):
- Every `useEffect` mount has a cleanup that disposes BufferGeometry, Materials, Textures, BVH, Audio sources, and any koota host refs.
- Material clones disposed individually.
- Audio source nodes paired: `play(loop:true)` → matching `stop()` on unmount.
- Level loader frees its asset GLBs on rail-leave.

## Out of scope (v1)

Multiplayer · skeletal animations · viewmodel-arms IK · day/night · outdoor biomes · procedural levels · mid-run shop · custom-mapped weapons.
