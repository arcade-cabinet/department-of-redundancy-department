@/Users/jbogaty/.claude/profiles/standard-repo.md
@/Users/jbogaty/.claude/profiles/ts-browser-game.md

# CLAUDE.md — Department of Redundancy Department

> **Canon:** [`docs/spec/`](./docs/spec/) — read `00-overview.md`, `04-construction-primitives.md`, and `05-screenplay-language.md` first.

## Identity

A **mobile-first arcade rail shooter** in the Time Crisis / House of the Dead / Virtua Cop lineage. Single canonical run — 8 cubicle/stair levels + 1 boardroom boss arena, ~9 min on Normal. **The arcade-cabinet experience in your pocket.**

## Architecture (locked — see `.agent-state/directive.md`)

| Layer | Tech |
|---|---|
| Renderer | `@babylonjs/core` + `@babylonjs/loaders` + `@babylonjs/gui` |
| Native shell | `@capacitor/core` + `@capacitor/preferences` |
| Pause/resume | `document.visibilitychange` (no `@capacitor/app`) |
| DOM | one `<canvas id="game">` in root `index.html` |
| Persistence | `Capacitor.Preferences` (settings, high scores). **No SQLite, no save blob.** |
| Bundler | Vite 8 |
| Lint | Biome 2.4 |
| Tests | Vitest 4 (node only) |
| Pkg | pnpm 10.33.0, Node 22, TypeScript 6 |

**No React. No router. No PRNG. No AI library. No FSM library. No fog. No skeletal animations. No viewmodel-arms IK.**

## Source layout

```
src/
├── main.ts                    # boot — Babylon Engine + Game + Director + GUI
├── preferences.ts             # Capacitor.Preferences read/write
├── rail/                      # camera-rail state machine
├── encounter/                 # screenplay director + enemies + fire programs
├── levels/                    # per-level data files (one per docs/spec/levels/)
├── game/                      # Game state machine + GameState
└── gui/                       # Babylon GUI overlays (insert-coin, continue, etc.)

index.html                     # root — single canvas, no React
docs/spec/                     # design canon — source of truth
```

## The screenplay model (architectural keystone)

A **level is a screenplay** — a cue list keyed off wall-clock + rail-events. The encounter director plays it like a film projector. Enemies are **dumb props** on spawn rails: they cannot stop firing, retreat, aim, or notice the player. The director is the only thing with agency.

See `docs/spec/05-screenplay-language.md` for the cue-verb reference and `docs/spec/02-encounter-vocabulary.md` for archetype + fire-pattern tables.

## Construction primitives

Levels are **bags of construction primitives + props + a camera rail + a cue list**. No "big level GLB." Every wall, every door, every window is an authored decision picking from the curated library:

- 94 retro door PNGs (`public/assets/textures/retro/doors/`)
- 120 retro window PNGs (`public/assets/textures/retro/windows/`)
- 26 retro shutter PNGs (`public/assets/textures/retro/shutters/`)
- 5 PBR sets (`drywall`, `carpet`, `laminate`, `ceiling-tile`, `whiteboard`)

See `docs/spec/04-construction-primitives.md` for the schema and `src/levels/types.ts` for the engine mirror.

## Common commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Vite dev |
| `pnpm typecheck` | tsc --noEmit |
| `pnpm lint` | biome check |
| `pnpm lint:fix` | biome check --write (auto-organize imports + format) |
| `pnpm test:node` | vitest node |
| `pnpm build` | Vite production build |
| `pnpm cap:sync` | Capacitor sync to native shells |

## Disposal contract

Every Babylon resource (`Scene` / `Mesh` / `Material` / `Texture` / `AnimationGroup` / `Sound`) constructed by a level is captured at construction and disposed via `scene.dispose()` (cascades) on the `transition` cue. Shared assets (hands, weapons, common enemies) live in a long-running asset cache.

## Wiring rule (ABSOLUTE)

A FEATURE IS NOT DONE UNTIL IT IS WIRED INTO THE PLAYABLE GAME LOOP AND VISIBLE TO THE PLAYER.

A pure-data table + a unit test is NOT a shipped feature. Before claiming any task done:
1. The module must be imported in `src/main.ts` boot path or by a level data file.
2. The runtime must call its functions on tick / event / cue.
3. The player must observe the effect (visual, audio, gameplay change).

## Out of scope

No multiplayer, no exploration, no movement (player rides the rail), no procedural generation, no inventory beyond active-weapon ammo, no skill trees, no XP, no character customization, no pickups (no crate-pop, no health packs, no ammo crates — ammo auto-replenishes on reload).

This is an arcade cabinet. You insert a coin, you ascend the tower, you score, you die or you win, you tap "ANOTHER COIN."
