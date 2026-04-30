---
title: Architecture
updated: 2026-04-30
status: current
domain: technical
---

# Architecture

DORD is a **mobile-first arcade rail shooter** in the Time Crisis / House of the Dead / Virtua Cop lineage. This file points at the canon. Read the canon first.

## Source of truth

The design canon is in [`docs/spec/`](./spec/):

- `00-overview.md` — game-in-one-paragraph, run shape, tone arc, asset reuse
- `01-pacing-and-time-math.md` — per-level seconds, attack-rate budgets, reticle math
- `02-encounter-vocabulary.md` — archetype + fire-pattern + cease-condition tables
- `03-difficulty-and-modifiers.md` — 2×5 difficulty grid + daily-challenge modifiers
- `04-construction-primitives.md` — Wall/Floor/Door/Window/Shutter/etc. schemas
- `05-screenplay-language.md` — cue triggers + cue-action verb reference
- `levels/01-lobby.md` … `levels/08-boardroom.md` — per-level screenplays
- `playtest-2026-04-30.md` — paper playtest report

## Layers

| Layer | Tech | Module |
|---|---|---|
| Renderer | `@babylonjs/core` + `@babylonjs/loaders` + `@babylonjs/gui` | `src/main.ts` |
| Camera rail | pure-function rail state machine (Babylon `Vector3`) | `src/rail/` |
| Screenplay director | wall-clock + rail-event cue queue + dumb-prop enemies | `src/encounter/` |
| Levels | per-level data files (primitives + spawn rails + camera rail + cues) | `src/levels/` |
| Game state | top-level state machine: insert-coin → playing → continue → game-over | `src/game/` |
| GUI overlays | Babylon GUI (insert-coin, continue, game-over, settings, reticle) | `src/gui/` |
| Persistence | `@capacitor/preferences` — settings + high scores | `src/preferences.ts` |
| Mobile shell | Capacitor 8 | `capacitor.config.ts` (root) |

## What's NOT here

- No React, no React Three Fiber, no drei, no rapier.
- No three.js direct mounts (everything goes through Babylon).
- No SQLite, no drizzle, no save blob.
- No PRNG (`Math.random()` is not used in gameplay code; gameplay is fully scripted).
- No AI library (no yuka, no behaviour trees, no FSMs). The director is the brain; enemies are dumb props.
- No fog. No skeletal animations. No viewmodel-arms IK.

## State model

- **DirectorState** (`src/encounter/EncounterDirector.ts`) — per-tick game state. Immutable updates each frame. Holds rail state, enemy map, fired-cue set, current dwell metadata.
- **GameState** (`src/game/GameState.ts`) — top-level run state. Phase + run object (HP, lives, score, combo, level id). Pure-function transitions.
- **`Capacitor.Preferences`** — settings KV (`dord:settings:v1`) + high scores (`dord:high-score:v1` + per-day daily-challenge keys).

There is no koota, no ECS layer. The data flow is one-way:

```
input → Game → director.tick(dt) → listener side-effects (Babylon mesh ops + audio)
                                  ↓
                         camera-rail position → camera transform
```

## The screenplay model (architectural keystone)

A **level is a screenplay**. The encounter director plays it like a film projector — frame after frame, no agency, no branching.

Every dynamic thing in a level rides a rail:
- **Camera rail** — the player's POV path through the level
- **Spawn rails** — short waypoint paths attached to doors / desks / panels / rafters that props slide along when a cue spawns them
- **Civilian rails** — pedestrians on authored walk paths

**Enemies are dumb props.** They cannot decide anything. The director:
- Ticks the cue queue (wall-clock + rail-event triggers)
- Ticks active enemies (which just advance their fire-program tape)
- Processes player hits, applies damage, calls `kill()` or `cease()`
- Decides when to clear a position, force-end a dwell, transition levels, freeze on player death, resume on continue

See `docs/spec/05-screenplay-language.md` for the cue-verb reference.

## Construction primitives model

Levels are **bags of construction primitives + props + camera rail + cue list**. There is no "big level GLB."

Construction primitives:
- **Wall / Floor / Ceiling** — quads with PBR (drywall / carpet / laminate / ceiling-tile / whiteboard)
- **Door** — wall with one of 94 retro door textures, optional spawn-rail attachment
- **Window** — wall with one of 120 retro window textures (frosted-glass for HR Corridor, etc.)
- **Shutter** — roll-down with one of 26 retro shutter textures
- **Whiteboard** — wall with whiteboard PBR + dynamic-texture caption
- **Pillar** — structural cover
- **Prop** — GLB instance from `public/assets/models/`
- **Light** — point / spot / hemispheric / directional

See `docs/spec/04-construction-primitives.md` for the schema and `src/levels/types.ts` for the engine mirror.

## Babylon disposal contract

Every level captures every Babylon resource it constructs (`Scene` / `Mesh` / `Material` / `Texture` / `AnimationGroup` / `Sound`) and disposes via `scene.dispose()` (cascades) on the `transition` cue. Shared assets (hands, weapons, common enemy archetypes) live in a long-running asset cache loaded once at game-start.

Levels are finite-size. The OOM problem from the prior voxel-chunk architecture doesn't apply, but the discipline still holds.

## Out of scope (v1)

Multiplayer · skeletal animations · viewmodel-arms IK · day/night · outdoor biomes · procedural levels · mid-run shop · custom-mapped weapons · pickups (no crate-pop, no health packs, no ammo crates).
