---
title: Difficulty and Modifiers
updated: 2026-04-30
status: current
domain: product
---

# Difficulty and Modifiers

The game has one canonical run shape (`00-overview.md`). Difficulty is the only player-facing variability in the run itself. The director applies the per-difficulty multipliers below when instantiating enemies and resolving cues.

The Daily Challenge layers a single modifier on top of a Normal-difficulty run. The "seed" for daily-challenge selection is `dayOfYear % poolLength` — there is no PRNG.

## Difficulty selector

A 2-row × 5-column grid. Player picks difficulty + lives independently. Selection persists via `Capacitor.Preferences`. Default: Normal-3.

```
                Easy        Normal      Hard       Nightmare    Ultra Nightmare
3 lives     [  E-3   ]   [  N-3   ]  [  H-3  ]  [   NM-3   ]  [    UN-3    ]
              0.5×          1.0×        1.5×        2.5×          4.0×

Permadeath  [  E-1   ]   [  N-1   ]  [  H-1  ]  [   NM-1   ]  [    UN-1    ]
              1.0×          2.0×        3.0×        5.0×          8.0×
```

Permadeath toggle sits between the rows in the UI. The score multipliers stack with combo and length multipliers from the score model below.

## Per-difficulty parameter table

All numbers are multipliers on Normal baselines unless marked absolute. The director reads this table on level boot and applies the values when instantiating enemies and dispatching `aim-laser` events.

| Parameter | Easy | Normal | Hard | Nightmare | Ultra Nightmare |
|---|---|---|---|---|---|
| **Reticle wind-up time** (`aim-laser.durationMs`) | 1.5× | 1.0× | 0.85× | 0.65× | 0.5× |
| **Reticle commit time** (cover window before `fire-hitscan`) | 1.5× | 1.0× | 0.7× | 0.5× | 0.4× |
| **Beats per combat position (avg)** | 2.0 | 2.5 | 3.0 | 3.5 | 4.0+ |
| **Civilian density** (per `wall-clock` schedule) | 1 in 5 positions | 1 in 4 | 1 in 3 | 1 in 2 | every position |
| **Enemy HP** | 0.8× | 1.0× | 1.2× | 1.4× | 1.6× |
| **Enemy fire rate** (loop interval on looping fire programs) | 0.7× | 1.0× | 1.2× | 1.5× | 1.8× |
| **Enemy damage on player** | 0.7× | 1.0× | 1.15× | 1.3× | 1.5× |
| **Score multiplier** | 0.5× / 1.0× | 1.0× / 2.0× | 1.5× / 3.0× | 2.5× / 5.0× | 4.0× / 8.0× |

Score multiplier shown as `3-lives / Permadeath`.

Mini-boss and final boss HP are NOT multiplied by difficulty — bosses have explicit per-difficulty HP tables in their level docs.

## Adaptive difficulty within a position

Independent of the selector, every difficulty applies an in-position adaptive scaling to wind-up time:

```
effective_windup = base_windup × max(0.5, 1 - 0.05 × hitless_kills_in_position)
```

After 10 hitless kills in a row within a position, wind-up shrinks to 50% of base. Damage taken or a missed shot resets the streak. Razing-Storm pattern — feels responsive, tightens the high-skill ceiling without raising the floor.

This is the **only** runtime mutation to the otherwise fully scripted screenplay. The director computes the effective wind-up at the moment of dispatching an `aim-laser` event; nothing else looks at the streak counter.

## Permadeath specifics

The Permadeath toggle:
- Sets player lives to 1 (vs. 3 default)
- Doubles the score multiplier of the matched 3-lives row
- Adds a "PERMADEATH" badge to the run UI (red border, audio sting on death)
- Saves the run's death state for the daily-challenge leaderboard separately

Permadeath does NOT change enemy stats or reticle windows — those are tied to the difficulty column. So N-1 has Normal danger but is harder by virtue of "no second chance." UN-1 is the final boss of difficulty grids.

## Daily Challenge

Once per day, a daily-challenge run is offered alongside the difficulty grid:

- **Fixed levels** — same 8 levels in same order
- **Fixed difficulty** (always Normal)
- **One modifier** drawn from the curated pool below
- **Modifier index** = `dayOfYear % poolLength` (UTC). No PRNG. No persistent seed file.

The daily-challenge leaderboard is separate from the main difficulty leaderboards — "best score on today's challenge run." Resets at midnight UTC.

### Daily modifier pool

Authored modifiers. The director honours the active modifier as a one-shot mutation on level construction (no per-frame conditional sprawl).

| Modifier | Effect |
|---|---|
| **No reload** | Pull-trigger = fire OR auto-reload happens at end-of-mag with no input |
| **Headshots only** | Body shots do 0 damage, only headshots count |
| **Speed run** | Time bonuses tripled, civilian penalty halved |
| **Permadeath** | One life, score 1.5× |
| **No HUD** | All HUD elements hidden except the reticle |
| **Civilian rush** | Civilian density doubled |
| **Spray and pray** | All weapons get +50% spread; rewards close-range play |
| **Iron man** | No mid-run health restore (no continues) |
| **The Reaper has friends** | Boardroom adds +2 swat ads to every Reaper phase |
| **Justice only** | Score is justice-shot-bonus only — kills don't count |
| **Sticky aim** | Slight aim assist toward the closest red-reticle enemy |
| **Mass-pop madness** | Every cubicle floor has 2 mass-pops instead of 1 |
| **Boss rush** | Skip cubicle floors and stairways; go straight from Lobby intro to Reaper |
| **Backwards** | Stage order reversed: Boardroom first, Lobby last |
| **Charge week** | Charge beats spawn at 3× normal density |
| **Glass cannon** | Player damage tripled, player HP halved |
| **Pistol only** | Rifle disabled; pistol unlimited ammo |
| **Rifle only** | Pistol disabled; rifle unlimited ammo |

~18 modifiers in v1. Daily picks one deterministically per UTC date. Adding more is a content-only update post-launch — append to the pool, the modulo handles the rest.

## Per-difficulty unlocks

Default game starts with Easy + Normal unlocked. Higher difficulties unlock by completing prerequisites:

| Unlock | Prerequisite |
|---|---|
| Hard | Clear Normal-3 once |
| Nightmare | Clear Hard-3 once |
| Ultra Nightmare | Clear Nightmare-3 once |
| Permadeath toggle | Clear current difficulty's 3-lives version once |

This gates the leaderboard tiers — UN-1 leaderboard is only populated by players who've already proven they can clear Nightmare-3.

## Score multiplier interactions

Final score formula:

```
final_score = sum_of_per_kill_scores × combo_multiplier × difficulty_multiplier × modifier_bonus
```

Where:
- `per_kill_score` = base (100 body / 250 head / 200 justice / -500 civilian)
- `combo_multiplier` = `1.0 + 0.05 × min(combo_count, 30)` → caps at 2.5×
- `difficulty_multiplier` = from the table above
- `modifier_bonus` = +0.5× if Daily Challenge active, +1.0× if a hard modifier (e.g., No HUD, Iron Man)

Examples:
- Clean N-3 run, 30-combo at end, 50,000 base score: `50,000 × 2.5 × 1.0 = 125,000`
- Same run on UN-1: `50,000 × 2.5 × 8.0 = 1,000,000`
- Same run on UN-1 Daily Challenge with Iron Man: `50,000 × 2.5 × 8.0 × 1.5 = 1,500,000`

The 8.0× UN-1 multiplier is balance-tuned to make UN-1 leaderboard scores ~10× higher than N-3 scores for equivalent skill. Daily Challenge bonus is small (+0.5×) because the modifier itself is the challenge.

## Difficulty effect on level docs

Per-level docs author the **Normal** composition. The runtime applies difficulty-scaled parameters from this doc at runtime; level docs don't repeat per-difficulty tables.

Exception: **mini-boss and final-boss HP are documented per difficulty in their respective level docs** because boss HP balance is too sensitive to derive from a multiplier.

## Difficulty validation targets

Every difficulty must satisfy:

1. **Easy** — an attentive player with average aim clears their first run ~70% of the time
2. **Normal** — same player clears first try ~30% of the time
3. **Hard** — ~10% first-try clear rate; veteran-level
4. **Nightmare** — ~3% first-try clear rate; mastery-level
5. **Ultra Nightmare** — ~0.5% first-try clear rate; leaderboard-tier

These are paper-playtest validation targets. Adjust the parameter table if rates deviate substantially after broader playtesting (`docs/spec/playtest-2026-04-30.md`).
