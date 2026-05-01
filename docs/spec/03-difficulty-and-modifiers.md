---
title: Director Parameter Table (engine-internal)
updated: 2026-04-30
status: current
domain: product
---

# Director Parameter Table (engine-internal)

> **Pivot 2026-04-30:** The difficulty selector and the daily-challenge picker are gone. DORD ships as a **single canonical run** (`00-overview.md`). This document used to author 10 player-facing difficulty cells × 18 modifiers. It is now reduced to a single column: the parameters the director uses to instantiate one canonical run.
>
> The per-difficulty grid below is retained as **engine-internal authoring scaffolding** — the screenplay engine still wants to read tunable enemy HP, fire rate, etc. from a named parameter set rather than scatter magic numbers. The "Normal" column is the live one. The other columns are kept as design-spectrum reference for future tuning, but **no UI ever exposes them**.

## The canonical run

One run shape, one parameter column, ~9 minutes:

- 3 lives.
- Continues funded by the persistent quarter balance (`06-economy.md`).
- INSERT COIN starts the run for free.
- The director uses the **Normal** column of the parameter table below.

There is no toggle. There is no picker. There is no daily challenge.

## Director parameter table

The director reads the **Normal** column on level boot and applies the values when instantiating enemies and dispatching `aim-laser` events. The other columns exist as reference material for future tuning passes; they are not selectable at runtime.

| Parameter | Easy (ref) | **Normal (live)** | Hard (ref) | Nightmare (ref) | Ultra Nightmare (ref) |
|---|---|---|---|---|---|
| **Reticle wind-up time** (`aim-laser.durationMs`) | 1.5× | **1.0×** | 0.85× | 0.65× | 0.5× |
| **Reticle commit time** (cover window before `fire-hitscan`) | 1.5× | **1.0×** | 0.7× | 0.5× | 0.4× |
| **Beats per combat position (avg)** | 2.0 | **2.5** | 3.0 | 3.5 | 4.0+ |
| **Civilian density** (per `wall-clock` schedule) | 1 in 5 positions | **1 in 4** | 1 in 3 | 1 in 2 | every position |
| **Enemy HP** | 0.8× | **1.0×** | 1.2× | 1.4× | 1.6× |
| **Enemy fire rate** (loop interval on looping fire programs) | 0.7× | **1.0×** | 1.2× | 1.5× | 1.8× |
| **Enemy damage on player** | 0.7× | **1.0×** | 1.15× | 1.3× | 1.5× |

Mini-boss and final boss HP are NOT multiplied — bosses have explicit HP values authored in their level docs.

## Adaptive difficulty within a position

Independent of the parameter column, the canonical run applies in-position adaptive scaling to wind-up time:

```
effective_windup = base_windup × max(0.5, 1 - 0.05 × hitless_kills_in_position)
```

After 10 hitless kills in a row within a position, wind-up shrinks to 50% of base. Damage taken or a missed shot resets the streak. Razing-Storm pattern — feels responsive, tightens the high-skill ceiling without raising the floor.

This is the **only** runtime mutation to the otherwise fully scripted screenplay. The director computes the effective wind-up at the moment of dispatching an `aim-laser` event; nothing else looks at the streak counter.

## Score formula

Final score for a completed run:

```
final_score = sum_of_per_kill_scores × combo_multiplier
```

Where:
- `per_kill_score` = base (100 body / 250 head / 200 justice / −500 civilian)
- `combo_multiplier` = `1.0 + 0.05 × min(combo_count, 30)` → caps at 2.5×

There is no difficulty multiplier (only one difficulty exists). There is no modifier bonus (no modifiers). The leaderboard ranks runs on this single canonical formula.

## What is gone

The following sections existed in earlier drafts and have been **removed** by the canonical-run pivot. Do not resurrect them without an explicit design reversal:

- The 2×5 difficulty selector grid.
- The Permadeath toggle and the doubled-multiplier row.
- The per-difficulty unlock ladder (Hard requires Normal-3 clear, etc.).
- The 18-modifier daily-challenge pool.
- The `dayOfYear % poolLength` daily seeding.
- Modifier-flag effects on `GameState` (`forcePermadeath`, `glassCannon`, `ironMan`, `noHud`, `headshotsOnly`, `pistolOnly`, `rifleOnly`, `noReload`, `justiceOnly`).
- The separate daily-challenge leaderboard.

## Validation target

The canonical run is tuned for an attentive player with average aim to clear it first try ~30% of the time. Adjust the live Normal column if paper-playtest data (`docs/spec/playtest-2026-04-30.md`) deviates substantially.
