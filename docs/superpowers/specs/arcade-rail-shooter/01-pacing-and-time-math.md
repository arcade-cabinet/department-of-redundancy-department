---
title: Pacing and Time Math
updated: 2026-04-30
status: current
domain: product
---

# Pacing and Time Math

This doc anchors every level's authored time budget in research-grounded numbers. Authoring decisions reference this doc; the level docs cite specific budgets back to the constants here.

## Run total target

**Normal difficulty target: 9:00 ± 0:30.**

| Difficulty | Expected run time | Why |
|---|---|---|
| Easy | 7:00-8:00 | Generous reticle windows = faster scene clears |
| Normal | 8:30-9:30 | Baseline |
| Hard | 9:00-10:00 | Tighter windows, denser civilians, more ammo conservation |
| Nightmare | 9:30-11:00 | Damage-on-miss, denser civilians, faster enemies, more retries |
| Ultra Nightmare | 10:00-12:00+ | Restart-heavy on Permadeath; scored on first-clear time |

The run TIME range is not the design target — the run STRUCTURE is. Time is what the structure produces under fair play.

## Level-by-level budget (Normal)

| # | Level | Time | Combat positions | Notes |
|---|---|---|---|---|
| 1 | Lobby | 75s | 3 | Tutorial-grade pace; first beats are gentle |
| 2 | Stairway A | 60s | 1 mid-stair | Vertical perspective intro; light enemies |
| 3 | Open Plan | 75s | 3 | Higher baseline; civilians more frequent |
| 4 | Stairway B | 90s | 2 | Mid-stair + landing-door wave |
| 5 | HR Corridor | 75s | 3 | Hostage-shield beats appear |
| 6 | Stairway C | 120s | 2 | Heavy resistance climb; pre-boss tension |
| 7 | Executive Suites | 75s | 3 | Mass-pop and high-tier enemies |
| 8 | Boardroom | 60s | 1 (boss only) | Reaper, 3 phases |
|   | **Total** | **630s = 10:30** | **18** | |

Plus inter-level transitions (~5s glide each, 7 transitions) = ~35s buffer = run lands at **~10:00**.

If playtest shows this is consistently long, two trim levers:
- Stairway A from 60s → 45s (reduces total by 15s)
- Boardroom from 60s → 45s (reduces total by 15s)

If playtest shows it's consistently short, lengthen the cubicle floors before adding more stairway content (cubicle floors are where the gameplay lives).

## Per-combat-position budget

A "combat position" is where the rail stops and the player engages. Average position is **~25 seconds at Normal**, broken down as:

| Phase | Seconds | What happens |
|---|---|---|
| Entry | 2 | Camera dips behind cover; first enemy reticle goes orange |
| Engagement | 18-20 | Player pops cover, fires, drops, reloads; 2-4 beats fire |
| Cleanup | 3 | Last enemies drop; camera holds for ~1s; rail resumes |
| Glide to next | 2 | Smooth interpolation along rail polyline |

Some positions are shorter (Lobby position 1, ~15s as a tutorial). Some are longer — mini-boss positions hit 35-40s. The 25s average is a planning constant; specific positions deviate.

### Per-combat-position attack rate budget

The attack rate constraint: **Normal difficulty should have ≤4 simultaneously-orange-or-red reticles on screen.** This ensures a competent player can prioritize threats without being overwhelmed. Higher difficulties allow up to 6 (Hard) or 8 (Nightmare/UN) simultaneous threats.

```
Normal:           ≤4 simultaneous orange/red reticles
Hard:             ≤6
Nightmare:        ≤8
Ultra Nightmare:  ≤10 + civilian density doubles
```

Authoring rule: If a position spawns more than this many enemies, stagger their wind-ups so the simultaneous-orange-or-red count stays under the cap.

## Encounter-beat timing constants

These are research-grounded from Time Crisis II / House of the Dead 2 longplays. Each beat has a documented **wind-up** (green-to-orange) and **commit** (orange-to-red) time.

| Beat | Wind-up | Commit | Total telegraph | Time-to-kill (player perspective) |
|---|---|---|---|---|
| `door-burst` | 0.8s | 0.4s | 1.2s | ~1.5s if player is ready |
| `cover-pop` | 0.5s | 0.3s | 0.8s | ~1.0s — fastest beat |
| `vault-drop` | 1.0s | 0.5s | 1.5s | ~2.0s — has airtime |
| `crawler` | 1.5s | 0.8s | 2.3s | ~2.5s — slow telegraph, close range |
| `background-shamble` | 3.0s+ | 1.0s | 4.0s+ | ~4.0s — easy headshot at distance |
| `charge` | 2.0s | 0.6s | 2.6s | ~3.0s — must stop before contact |
| `vehicle-entry` | 1.2s | 0.5s | 1.7s | ~2.5s × 2-3 enemies |
| `drive-by` | 0.7s | 0.4s | 1.1s | ~1.5s window |
| `rooftop-sniper` | 1.5s | 0.6s | 2.1s | ~2.5s — small target, big damage |
| `lob` | 1.0s (arc) | 0.5s | 1.5s | shoot-projectile or cover |
| `hostage` | 2.5s+ | varies | 2.5s+ | precision shot to enemy |
| `civilian` | n/a | n/a | n/a | DON'T shoot |
| `crate-pop` | 0.5s | 0.5s | 1.0s | optional |
| `justice-opportunity` | 0.3s glint | 0.3s | 0.6s | precision-shot bonus |
| `mass-pop` | 1.0s synchronized | 0.4s | 1.4s | sweep-fire or sequence |
| `boss-phase` | varies per pattern | varies | varies | per-boss spec |

### Difficulty multipliers on telegraph times

| Difficulty | Wind-up multiplier | Commit multiplier |
|---|---|---|
| Easy | 1.5× (longer warning) | 1.5× |
| Normal | 1.0× | 1.0× |
| Hard | 0.85× | 0.7× |
| Nightmare | 0.65× | 0.5× |
| Ultra Nightmare | 0.5× | 0.4× |

A `cover-pop` on UN = 0.25s wind-up + 0.12s commit = 0.37s total. That's reflexes-only territory; the genre's hardest cabinet players rate this as mastery-tier difficulty.

### Adaptive difficulty (Razing Storm pattern)

Within a single combat position, a hitless streak shrinks the wind-up time further:

```
effective_windup = base_windup × max(0.5, 1 - 0.05 × hitless_kills_in_position)
```

Floor at 50% — never zero. Good play feels tight; a missed shot or damage taken resets to base.

## Scene composition rules

Authoring constraints to keep beats from chaining badly:

1. **No more than 2 of the same beat type back-to-back** within a single combat position. Variety beats repetition.
2. **Always have at least one "calm beat" (background-shamble or crate-pop) per 3 high-pressure beats** to give the player a breath.
3. **Civilians appear in roughly 1 of 4 combat positions on Normal** (50% on Hard, 75% on Nightmare, 100% on UN). Never two civilians in the same position.
4. **Mini-boss positions don't spawn civilians** — too much going on already.
5. **Mass-pop appears at most once per cubicle floor** — it's a climax beat, not a baseline.
6. **Charge beats appear sparingly on Stairway levels** — the tilted camera makes Z-distance hard to judge.

## Difficulty effects on level pacing

Beyond reticle windows, difficulty changes encounter density:

| Difficulty | Beats per combat position (avg) | Civilian density | Ammo drop rate | Enemy HP |
|---|---|---|---|---|
| Easy | 2.0 | 1 in 5 positions | 1.3× | 0.8× |
| Normal | 2.5 | 1 in 4 positions | 1.0× | 1.0× |
| Hard | 3.0 | 1 in 3 positions | 0.85× | 1.2× |
| Nightmare | 3.5 | 1 in 2 positions | 0.7× | 1.4× |
| Ultra Nightmare | 4.0+ | every position | 0.55× | 1.6× |

Per-level docs author the "Normal" composition. The runtime applies difficulty modifiers via the constants above; per-level docs do not need difficulty-specific scene tables.

## Stairway pacing (the new pattern)

Stairways are vertically-tilted rail segments with **1-2 combat positions** rather than the cubicle floor's 3. The tilt is ~25° (camera looks up the climb). Enemies emerge from landing doors above.

Stairway pacing per length:

| Stairway | Length | Combat positions | Beat composition |
|---|---|---|---|
| A (60s) | Lobby → Open Plan | 1 mid-stair | 2-3 background-shamble + 1 door-burst from landing |
| B (90s) | Open Plan → HR | 1 mid + 1 upper | door-burst + cover-pop on lower; mass-pop at top landing |
| C (120s) | HR → Executive | 2 stagged | door-burst with hitman emergence; rooftop-sniper from balcony; charge from lower flight |

Stairway difficulty escalates run-by-run. Stairway A is gentle (player learning the tilted perspective); Stairway C is the run's pre-boss tension peak.

## Mini-boss pacing

Each cubicle floor's final combat position is the **mini-boss arena** — a 35-40s engagement instead of the standard 25s.

Mini-bosses have:
- 2 phases (HP threshold transition at 50%)
- A telegraphed special attack per phase
- A weakpoint (head + a body-specific spot like "briefcase" or "name tag")
- ~2-3 ad spawns per phase (not infinite — kill the boss to end the encounter)

Mini-boss timing:
- Phase 1: 12-15s
- Transition (boss does a flash + visual effect, 2s of invuln): 2s
- Phase 2: 15-18s
- Death animation + scene clear: 2-3s

Mini-boss HP balanced so a player landing 70% of headshots clears in 35-40s on Normal.

## Boss pacing (Reaper)

Boardroom is **60s of pure boss fight**, no preceding rooms.

| Phase | Time | Reaper behavior |
|---|---|---|
| 1 — REDACT | 18-22s | Reaper at far end of boardroom; sustained REDACT projectile volley; player pops cover between volleys |
| 2 — TELEPORT | 18-22s | Reaper teleports between 4 corner positions; summons 2 swat ads; player must clear ads and damage Reaper between teleports |
| 3 — SUBPOENA | 18-22s | Reaper close-range; charging attacks; weakpoint exposed (briefcase glows); player has tight kill window |

Total: ~60s. HP balanced for ~50% headshot rate on Normal.

## Pacing macro-arc verification

Plotting target intensity (subjective 1-10 scale) across the run:

```
Intensity
  10 |                                                         ◯ Reaper
   9 |                                                       ╱
   8 |                                          ◯ Mini-boss╱
   7 |                                       ╱
   6 |                          ◯ Mini-boss
   5 |                       ╱
   4 |          ◯ Mini-boss╱
   3 |       ╱
   2 |  ◯ Mini-boss
   1 |╱
     +───────────────────────────────────────────────────────────>
       Lobby  StairA  OPlan  StairB   HR    StairC  Exec   Board
```

Each cubicle floor peaks at its mini-boss; each stairway is a controlled descent (smaller intensity drop on Stair A/B, larger drop on Stair C as the pre-boss lull). The Reaper closes the curve at the macro-peak.

This curve is the authoring target. Per-level docs verify against it.

## Memory budget per level

A consideration that didn't exist in the original spec but matters post-OOM: **each level loads a bounded asset set, disposes when the rail leaves**. Targets:

| Level | Loaded GLBs | Loaded textures | Estimated VRAM |
|---|---|---|---|
| Lobby | hands + 2 weapons + 2 enemies + ~6 props | marble + glass-brick + 4 doors + 4 walls | ~25 MB |
| Stairway A | hands + 2 weapons + 2 enemies + ~3 props | metal + 2 landing doors | ~12 MB |
| Open Plan | hands + 2 weapons + 3 enemies + ~8 props | cubicle-tile + paint + ~6 doors + 6 walls | ~30 MB |
| Stairway B | hands + 2 weapons + 2 enemies + ~3 props | metal + 2 landing doors | ~12 MB |
| HR Corridor | hands + 3 weapons + 3 enemies + ~8 props | dark cubicle-tile + ~6 doors + 6 walls | ~30 MB |
| Stairway C | hands + 3 weapons + 3 enemies + ~3 props | metal + 2 landing doors | ~12 MB |
| Executive | hands + 3 weapons + 4 enemies + ~10 props | wood-panel + laminate + ~6 doors + 6 walls | ~35 MB |
| Boardroom | hands + 3 weapons + Reaper + 1 enemy + 4 props | mahogany + glass + brass | ~25 MB |

Peak per-level VRAM ~35 MB. Across the whole run if assets are kept loaded: ~180 MB.

Strategy: pre-load the next level during the current level's last combat position; dispose the previous level's exclusive assets during the next level's stairway. Shared assets (hands, weapons, common enemies) stay loaded for the whole run.

This is the memory discipline the OOM crash taught us. Every level doc has a "Memory budget" section.
