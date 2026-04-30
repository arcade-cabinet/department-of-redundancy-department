---
title: Arcade Rail Shooter — Overview
updated: 2026-04-30
status: current
domain: product
parent: ../2026-04-30-arcade-rail-shooter-design.md
---

# Arcade Rail Shooter — Overview

This folder is the working spec set for DORD as an arcade rail shooter. It supersedes any prior maze / voxel / floor-system documentation. Every doc in this folder is canon; the parent `2026-04-30-arcade-rail-shooter-design.md` is the elevator pitch and high-level architecture, while these per-level docs are the authoring intent.

## The game in one paragraph

You are an auditor sent into the Department of Redundancy Department on a hostile-shareholder mission. You ascend the corporate tower from the Lobby to the Boardroom, on rails, in first-person, with a pistol-and-rifle loadout. Each floor is one cubicle nightmare; each stairway between floors is a vertical ascent under fire. Enemies emerge from cubicle doors, vault over wall tops, charge from corridors. Office workers walk through the scenes — shoot them, lose score and HP. Reach the Boardroom, kill the HR Reaper, get out. Or die trying.

## Run shape

Every run is the same nine levels in the same order. Difficulty changes the danger; level structure does not change.

```
Lobby → Stairway A → Open Plan → Stairway B → HR Corridor → Stairway C → Executive Suites → Boardroom (Reaper)
```

Target run length is **~9 minutes Normal**, achievable across difficulties from ~7 minutes Easy to ~10 minutes Ultra Nightmare. Run length is not a player choice — the game is the game. Difficulty IS the choice.

## Difficulty grid (10 entries)

| Lives | Easy | Normal | Hard | Nightmare | Ultra Nightmare |
|---|---|---|---|---|---|
| 3 lives | 0.5× score | 1.0× score | 1.5× score | 2.5× score | 4.0× score |
| Permadeath | 1.0× score | 2.0× score | 3.0× score | 5.0× score | 8.0× score |

Permadeath is a toggle on the difficulty selector — same enemy danger as the corresponding 3-lives row, but one run at one life with a doubled multiplier. UN-1 (Ultra Nightmare permadeath) at 8.0× is the leaderboard tier; clearing it is a flex.

See `03-difficulty-and-modifiers.md` for full mechanical impact (enemy speed, reticle window length, civilian density, ammo drop rate, etc.).

## Doc map

```
arcade-rail-shooter/
├── 00-overview.md                  ← you are here
├── 01-pacing-and-time-math.md      ← per-level seconds, attack rates, position budgets
├── 02-encounter-vocabulary.md      ← every beat with parameters
├── 03-difficulty-and-modifiers.md  ← 2×5 grid + daily-challenge modifiers
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

## What's authored vs. systemic

### Authored (hand-crafted per level)

- Rail topology — the polyline through the level, including combat-position locations
- Combat-position scene composition — which encounter beats fire, in what order, with what enemy archetypes
- Civilian placements — where and when office workers walk through
- Set pieces — the one or two memorable beats specific to that level (e.g., the Lobby's "fire alarm goes off, all the cubicle doors open at once" moment)
- Mini-boss / boss patterns — phase transitions, attack patterns, weakpoints
- Pickup placements — weapon drops, ammo crates, mineable cabinets

### Systemic (rolled per-run from RNG)

- Enemy archetype within pool — "this scene's cover-pop is a hitman not a manager"
- Pickup variant — "this mineable cabinet drops a coffee instead of binder clips"
- Civilian archetype — "today's Lobby intern is bald instead of redhead"
- Daily-challenge modifier — applied uniformly across all levels for that day

The systemic layer keeps repeat runs varied without compromising authored pacing. The level structure stays fixed; the texture of each play rolls.

## Pacing philosophy

Each level has a **micro-arc**: open gentle (let player relearn the controls), rise to a sustained mid-section, climax with the mini-boss / set piece. Then the stairway resets the camera and lets the player breathe before the next floor opens at a higher baseline.

The full run has a **macro-arc**: rising tension across the four cubicle floors, with each floor's baseline higher than the previous floor's peak; a brief pre-Boardroom lull on Stairway C as the camera signals "we're almost there"; then the Boardroom Reaper fight as climax.

Both arcs are explicit constraints in the level docs, not vibes. See `01-pacing-and-time-math.md` for the numerical model.

## Asset reuse

Every curated asset has a v1 home in this design:

| Asset | Use |
|---|---|
| FPS hands GLB | Always-visible viewmodel |
| 6 weapon GLBs | Player viewmodels, per-tier mechanics from weapon-progression branch |
| 4 enemy GLBs (manager / policeman / hitman / swat) | Encounter beat enemies, reskinned per biome via material LUT |
| Reaper GLB | Final boss, Boardroom |
| 50 trap GLBs | Set dressing, mineable cabinets, animated spawn-closet doors |
| 240 retro door PNGs | Per-biome spawn-closet door variety |
| 240 retro window/shutter PNGs | Per-biome cubicle wall variety |
| 66 audio files | Per-biome ambience, weapon SFX, impacts, UI cues, stingers |
| `viewmodel-grips.json` | Per-weapon viewmodel scale/rotation transforms |

New asset needs:
- 3 office-worker GLBs (intern / consultant / executive) for civilians
- 1 reception desk GLB (Lobby)
- 1 boardroom table GLB + chair instance (Boardroom)
- Marble + glass-brick floor materials (1-2 PNGs)

Existing `staircase-1.glb` and `staircase-2.glb` in `public/assets/models/props/` cover the stairway visual.

## Implementation phasing

Doc set ships first (this folder, fully written, committed). Then implementation in 6 phases:

| Phase | Slice | Validates |
|---|---|---|
| 1 | Rail + camera + 1 weapon + 1 enemy + 1 beat | Core verb loop end-to-end |
| 2 | Cover + reticle + 5 beats + civilians | Player skill expression |
| 3 | Scoring + combo + cabinet shell UI | Replay-driven game loop |
| 4 | Lobby + Stairway A + Boardroom + Reaper (Sprint-equivalent demo) | Full level system on smallest content surface |
| 5 | Open Plan + Stairway B + HR + Stairway C + Executive + their mini-bosses | Full canonical run |
| 6 | Difficulty grid + permadeath + daily challenge + leaderboards + polish | Replay loop + retention |

After Phase 4, an OOM-lockdown-lift gate: controlled headless playwright with `--max-old-space-size=2048` confirms memory stays bounded across a full demo run. Lockdown lifts only on user explicit approval after that gate passes.

## What this is not

This is not a maze game. There is no exploration. There is no movement. There is no procedural level generation. There are no mission-length presets. There is no multiplayer. There is no co-op. There is no inventory management beyond active-weapon ammo. There is no narrative branching. There are no skill trees. There is no XP. There is no character customization beyond the cosmetic weapon-ever-used gallery.

This is an arcade cabinet. You insert a coin, you ascend the tower, you score, you die or you win, you tap "ANOTHER COIN."
