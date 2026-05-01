---
title: Arcade Rail Shooter — Overview
updated: 2026-04-30
status: current
domain: product
---

> **Pivot 2026-04-30:** The difficulty selector and the daily-challenge picker have been removed. DORD ships as a **single canonical run** with a quarter-based continue economy. The director's per-difficulty parameter table is retained as engine-internal authoring (see `03-difficulty-and-modifiers.md`) — it is not surfaced to the player.

# Arcade Rail Shooter — Overview

This folder is the working canon for DORD as a **mobile-first arcade rail shooter** in the Time Crisis / House of the Dead / Virtua Cop lineage. **The arcade-cabinet experience in your pocket.**

Every doc in this folder is the source of truth for level construction and runtime behaviour. The screenplay model (`05-screenplay-language.md`) is the architectural keystone; the construction primitives (`04-construction-primitives.md`) are the level-construction vocabulary; the encounter vocabulary (`02-encounter-vocabulary.md`) is the enemy vocabulary; pacing & difficulty (`01-` / `03-`) are the runtime numerical model.

## The game in one paragraph

You are an auditor sent into the Department of Redundancy Department on a hostile-shareholder mission. You ascend the corporate tower from the Lobby to the Boardroom, on rails, in first-person, with a pistol-and-rifle loadout. Each floor is one cubicle nightmare; each stairway between floors is a vertical ascent under fire. Enemies emerge from cubicle doors, vault over wall tops, charge from corridors. Office workers walk through the scenes — shoot them, lose score and HP. Reach the Boardroom, kill the HR Reaper, get out. Or die trying.

## Run shape

Every run is the same nine levels in the same order. Difficulty changes the danger; level structure does not.

```
Lobby → Stairway A → Open Plan → Stairway B → HR Corridor → Stairway C → Executive Suites → Boardroom (Reaper)
```

Target run length is **~9 minutes**. Run length is not a player choice — the game is the game. There is no difficulty selector and no daily-challenge picker. The designer authored one canonical experience; the player rides it.

## Tone arc

The level set is structured as a tonal staircase from gentle satire to grand-guignol horror.

| Levels | Tone |
|---|---|
| Lobby, Open Plan | Gentle corporate satire — fluorescent lighting, motivational posters, radio chatter |
| HR Corridor, Stairway B | Tip-over — flickering lights, frosted-glass windows, paperwork as set dressing |
| Executive Suites, Boardroom | Grand-guignol — chandeliers, stag-head trophies, blood-on-marble |

The stairways between floors enforce the tonal beat. Stairway A is breezy. Stairway B is uncertain. Stairway C is oppressive — by the time the player reaches Executive Suites, the office building has stopped pretending.

## Mini-bosses & final boss

| Floor | Mini-boss |
|---|---|
| Lobby | **Security Chief Garrison** — pistol, two phases (regular → enraged) |
| Open Plan | **Senior Manager Whitcomb** — stapler-grenades, two phases |
| HR Corridor | **HR Director Phelps** — frosted-glass cover game, two phases |
| Executive Suites | **Director-of-Ops Crawford** — desk-bunker, two phases |
| Boardroom | **HR Reaper** — final boss, three phases |

Mini-boss patterns are bespoke fire-program tapes defined per-level (`02-encounter-vocabulary.md` says "see level doc"). The Reaper is the climax — three phase machine, full boardroom traversal, the only boss whose `boss-phase-3` runs the screenplay's `transition` cue (out to the credits-scroll level).

## Lives, continues, and the quarter economy

The arcade-cabinet metaphor is load-bearing. The player has:

- **3 lives per run.** Lose all three and the run ends.
- **Continues funded by quarters.** 1 quarter = 1 continue. Continues resume the current run on the floor where the player died with a fresh 3 lives.
- **A persistent quarter balance** stored via `Capacitor.Preferences` across sessions. Fresh install starts the player with **8 quarters ($2.00)**.
- **INSERT COIN is always free.** Starting a run costs nothing. Quarters are spent only on continues.

Quarters are earned by killing bosses:

| Boss | Drop |
|---|---|
| Security Chief Garrison | 1–2 quarters |
| Senior Manager Whitcomb | 1–2 quarters |
| HR Director Phelps | 1–2 quarters |
| Director-of-Ops Crawford | 1–2 quarters |
| **HR Reaper (final)** | 5 quarters |

When the balance hits 0 mid-run and the player declines a continue (or has no quarters to spend), the run wipes back to the title screen with the score banked into the high-score table. The persistent balance is preserved.

When the balance is 0 and the player taps INSERT COIN, the **friend modal** fires: "Your friend spots you a couple bucks." +8 quarters, the cabinet powers back up, the player runs again. This is a storytelling/immersion mechanic, not a scarcity gate — there is no rate limit and no daily lockout. The arcade is always open.

See `03-difficulty-and-modifiers.md` for the authored director parameter table (used by the screenplay engine; not exposed as a player toggle) and `06-economy.md` for the full quarter system.

## Verbs (5)

The player has exactly five verbs. Authoring stays inside these:

| Verb | Input | Effect |
|---|---|---|
| **aim** | drag (touch) / mouse (pointer) | Moves reticle; unaccelerated 1:1 mapping |
| **fire** | tap (touch) / click (pointer) | Hitscan along reticle, costs 1 ammo |
| **reload** | swipe down OR auto on empty | 1.0s animation |
| **cover** | tap-and-hold the bottom-of-screen cover button | Camera dips, all hitscans miss until release |
| **weapon-swap** | tap weapon icon (HUD) | Swaps pistol ↔ rifle |

Reticle is **HUD signal only** — it does NOT gate aiming. Aiming is the unaccelerated tap position. Reticle colour (green / orange / red, with blue for civilians) communicates threat state, nothing more.

## Doc map

```
docs/spec/
├── 00-overview.md                  ← you are here
├── 01-pacing-and-time-math.md      ← per-level seconds, attack rates, position budgets
├── 02-encounter-vocabulary.md      ← archetypes + fire programs + cease conditions
├── 03-difficulty-and-modifiers.md  ← authored director parameter table (engine-internal)
├── 04-construction-primitives.md   ← Wall/Floor/Door/Window/Shutter/etc. schemas
├── 05-screenplay-language.md       ← cue triggers + cue-action verb reference
├── 06-economy.md                   ← quarter system, boss drops, friend modal, persistence
├── playtest-2026-04-30.md          ← paper-playtest of the full run; friction report
└── levels/
    ├── 01-lobby.md                 ← Mini-boss: Security Chief Garrison
    ├── 02-stairway-A.md            ← 60s climb, light resistance
    ├── 03-open-plan.md             ← Mini-boss: Senior Manager Whitcomb
    ├── 04-stairway-B.md            ← 90s climb, mid resistance
    ├── 05-hr-corridor.md           ← Mini-boss: HR Director Phelps
    ├── 06-stairway-C.md            ← 120s climb, heavy resistance, oppressive ambience
    ├── 07-executive-suites.md      ← Mini-boss: Director-of-Ops Crawford
    └── 08-boardroom.md             ← FINAL BOSS: HR Reaper, 3 phases
```

## Architecture (one-paragraph)

Babylon.js renderer (`@babylonjs/core` + `@babylonjs/gui` + `@babylonjs/loaders`). Capacitor 8 native shell with `Capacitor.Preferences` for settings & high scores (no SQLite, no save blob — this is an arcade game). One `<canvas id="game">` in a root-level `index.html`. No React. No router. No PRNG (gameplay is fully scripted). No AI library — enemies are dumb props on spawn rails ticking authored fire-pattern tapes. The screenplay director is the only thing with agency.

See top-level `docs/ARCHITECTURE.md` for the full architecture doc.

## Asset reuse

Every existing curated asset has a v1 home in this design:

| Asset | Use |
|---|---|
| `security-guard.glb`, `middle-manager.glb`, `hitman.glb`, `head-of-security.glb` | Enemy archetypes (per `02-encounter-vocabulary.md`) — `security-guard` is the Office Security Guard, `head-of-security` is the Head of Security |
| `hr-reaper.glb` | Final boss (Boardroom) |
| `desk.glb`, `cabinet-1/2/3.glb`, `bedside-1/2.glb`, `closet.glb` | Cubicle / executive props |
| `staircase-1.glb`, `staircase-2.glb` | Stairway-level core geometry |
| `traps/trap-*.glb` (40+ files) | Set-dressing obstacles, cubicle clutter, executive boardroom hardware |
| 94 retro door PNGs | Per-biome door variety |
| 120 retro window PNGs | Per-biome wall decoration |
| 26 retro shutter PNGs | Storefront-style spawn closets, blinds |
| PBR sets: drywall, carpet, ceiling-tile, laminate, whiteboard | Construction primitives |
| Audio: 4 ambience layers, 6 stingers, 9 UI cues, 6 explosions, 12 footsteps, 12 impacts, 12 inventory cues | Per-level ambience + cue verbs |

Authored content TODOs (gaps to fill before content-lock):
- 3 office-worker GLBs (`intern`, `consultant`, `executive`) — civilian archetypes
- 1 reception desk GLB variant (Lobby) — or repurpose `desk.glb` with material swap
- 1 boardroom table GLB + chair instance (Boardroom) — or repurpose props with scale + tile
- Marble PBR set (Lobby + Boardroom) OR an authored material recolour of `laminate`

## What this is not

This is not a maze game. There is no exploration. There is no movement. There is no procedural level generation. There is no multiplayer. There is no co-op. There is no inventory management beyond active-weapon ammo. There is no narrative branching. There are no skill trees. There is no XP. There is no character customization. There is no difficulty selector. There is no daily-challenge picker. There are no modifier toggles. There are no ammo crates — ammo is auto-replenished on reload. The only authored pickup is the wall-mounted **health kit** (see `04-construction-primitives.md`), placed by the level designer at specific pacing beats; it is rail-compatible (shoot to collect as the camera passes).

This is an arcade cabinet. You insert a coin, you ascend the tower, you score, you die or you win, you tap "ANOTHER COIN."
