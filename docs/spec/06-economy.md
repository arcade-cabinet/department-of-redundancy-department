---
title: Quarter Economy
updated: 2026-04-30
status: current
domain: product
---

# Quarter Economy

> **The arcade-cabinet metaphor is load-bearing.** This document defines the only persistent player-facing currency in DORD: quarters. Quarters fund continues. They are earned by killing bosses, persisted via `Capacitor.Preferences`, and seeded on fresh install.

## The rules

| Rule | Value |
|---|---|
| Lives per run | **3** |
| Cost to start a run (INSERT COIN) | **0 quarters** — always free |
| Cost of a continue | **1 quarter** |
| Continue effect | Resume the current run on the floor where the player died, fresh 3 lives |
| Fresh-install starting balance | **8 quarters ($2.00)** |
| Persistence | `Capacitor.Preferences` key: `quarters.balance` |
| Quarter source | Boss kills only |
| Friend-modal trigger | Balance == 0 AND player taps INSERT COIN |
| Friend-modal grant | **+8 quarters** |
| Friend-modal cooldown | **None.** Always available. No daily lockout, no rate limit. |
| Run-wipe trigger | Balance == 0 AND player declines (or cannot afford) a continue |
| Run-wipe effect | Score banked to high-score table; `RunState` cleared; persistent balance preserved |

## Boss drops

| Boss | Floor | Quarter drop |
|---|---|---|
| Security Chief Garrison | Lobby | **1–2** |
| Senior Manager Whitcomb | Open Plan | **1–2** |
| HR Director Phelps | HR Corridor | **1–2** |
| Director-of-Ops Crawford | Executive Suites | **1–2** |
| **HR Reaper** (final) | Boardroom | **5** |

The 1–2 drop range is authored per boss in the `BOSSES` table. Mini-boss drops are weighted: Phase-2 (enraged) clears drop at the upper end of the range; Phase-1 timed-out clears drop at the lower end. The Reaper always drops 5 on Phase-3 clear.

A clean run from Lobby to Reaper earns **9–13 quarters** depending on mini-boss phase outcomes. A clean run replenishes the player's continue budget for the next session.

## Friend modal

When the player has 0 quarters and taps INSERT COIN:

```
┌─────────────────────────────────────┐
│                                     │
│    YOUR FRIEND SPOTS YOU            │
│       A COUPLE BUCKS                │
│                                     │
│         + 8 QUARTERS                │
│                                     │
│           [INSERT COIN]             │
│                                     │
└─────────────────────────────────────┘
```

This is **not** a scarcity gate. It is a storytelling/immersion mechanic. The arcade is always open, the friend is always good for it, the player always gets to play. The +8 grant resets the player to a full $2.00 budget so the loop reads "play → wipe → friend → play again" naturally.

There is no daily limit, no streak penalty, no cooldown. Anyone reading this doc and considering adding "but only once per day" should not do that — the user has explicitly rejected scarcity mechanics for this loop.

## Continue prompt

After death of the third life, if `balance > 0`:

```
┌─────────────────────────────────────┐
│                                     │
│    INSERT ANOTHER COIN              │
│                                     │
│    [CONTINUE]      [GIVE UP]        │
│                                     │
│    Quarters: N                      │
│                                     │
└─────────────────────────────────────┘
```

10-second countdown on the prompt. CONTINUE consumes 1 quarter, restores 3 lives, resumes on the floor of death. GIVE UP (or timeout) wipes the run.

If `balance == 0`, the prompt is replaced by the run-end summary screen — no continue offered, score banked, back to title.

## HUD

The HUD (`src/gui/HudOverlay.ts`) displays two distinct readouts:

| Readout | Source | Refreshes on |
|---|---|---|
| **LIVES** | `RunState.lives` | Damage, life loss, continue |
| **QUARTERS** | `quarters.balance` (Preferences-backed) | Boss kill, continue spend, friend modal, app boot |

The QUARTERS readout uses an arcade-cabinet 7-segment display style. The LIVES readout uses three pixel hearts (filled for remaining, dimmed for spent).

## Persistence schema

Stored under `@capacitor/preferences` namespace `dord.economy`:

| Key | Type | Default | Notes |
|---|---|---|---|
| `quarters.balance` | `number` (integer) | `8` (fresh install) | Authoritative across sessions |
| `quarters.lifetimeEarned` | `number` (integer) | `0` | Stat: total quarters earned from boss kills |
| `quarters.lifetimeSpent` | `number` (integer) | `0` | Stat: total quarters consumed by continues |
| `quarters.friendBailoutCount` | `number` (integer) | `0` | Stat: how many times the friend has spotted the player |

Lifetime stats are display-only — surfaced on a "Cabinet Stats" screen reachable from the title menu. They do not affect gameplay.

## Run-state separation

Quarters live **outside** `RunState`. They are persistent, the run is ephemeral. The flow:

1. Player taps INSERT COIN → `startRun()` called → fresh `RunState` with `lives: 3`.
2. Player plays. Bosses die → `awardQuarters(n)` mutates persistent balance, no `RunState` write.
3. Player dies (third life lost) → continue prompt.
   - If CONTINUE chosen → `spendQuarter()` decrements persistent balance, `RunState.lives` reset to 3.
   - If GIVE UP / timeout → score banked to high-score table, `RunState` discarded, balance preserved.
4. Back at title. Balance is whatever it was at the end of step 3.

`RunState` does not need a `quarters` field. The HUD reads the persistent balance directly via the quarters module.

## Implementation surface (`src/game/quarters.ts`)

A future implementation PR will add a single module with this shape:

```ts
// reads persistent balance, lazy-loads from Preferences once at boot
export function getBalance(): number;

// awards quarters from a boss kill; persists immediately
export function awardQuarters(n: number): Promise<void>;

// spends 1 quarter on a continue; returns true on success, false if balance is 0
export function spendQuarter(): Promise<boolean>;

// triggers the friend modal grant (+8 quarters); persists immediately
export function grantFriendBailout(): Promise<void>;
```

This module is the only file that touches `Capacitor.Preferences` for the economy. The HUD subscribes via a tiny event emitter so it can refresh on balance changes without polling.

## Out of scope

- IAP for quarters. (No real-money purchase. The friend modal IS the no-cost path.)
- Quarters as a scoring multiplier. (Quarters are a meta-progression budget, not a per-run modifier.)
- Quarter-cost cosmetics, weapon skins, alternate guns. (Single canonical loadout; no shop.)
- Daily quarter bonuses, login streaks, weekly resets. (No scarcity mechanics — the user has explicitly rejected these.)
- A separate "credits" or "tokens" currency. (Quarters are the only currency.)
