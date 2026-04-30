---
title: Design
updated: 2026-04-30
status: current
domain: product
---

# Design

This is a thin pointer. Authoritative design canon lives in [`docs/spec/`](./spec/):

- **Overview:** [`docs/spec/00-overview.md`](./spec/00-overview.md)
- **Pacing & time math:** [`docs/spec/01-pacing-and-time-math.md`](./spec/01-pacing-and-time-math.md)
- **Encounter vocabulary:** [`docs/spec/02-encounter-vocabulary.md`](./spec/02-encounter-vocabulary.md)
- **Difficulty & modifiers:** [`docs/spec/03-difficulty-and-modifiers.md`](./spec/03-difficulty-and-modifiers.md)
- **Construction primitives:** [`docs/spec/04-construction-primitives.md`](./spec/04-construction-primitives.md)
- **Screenplay language:** [`docs/spec/05-screenplay-language.md`](./spec/05-screenplay-language.md)
- **Per-level breakdowns:** [`docs/spec/levels/`](./spec/levels/) (Lobby → Boardroom)
- **Paper playtest:** [`docs/spec/playtest-2026-04-30.md`](./spec/playtest-2026-04-30.md)

## Identity (locked 2026-04-30)

Mobile-first arcade rail shooter. **Time Crisis / House of the Dead / Virtua Cop in cubicles.** Coin-op cabinet experience in your pocket.

## Run shape

Single canonical run — 8 cubicle/stair levels + 1 boardroom boss arena, ~9 min on Normal.

Lobby → Stairway A → Open Plan → Stairway B → HR Corridor → Stairway C → Executive Suites → Boardroom (Reaper).

## Verbs (5)

`aim` · `fire` · `reload` · `cover` · `weapon-swap`

## Reticle

3-state Virtua-Cop color (green / orange / red) + blue for civilians. First-class HUD primitive.

## Difficulty grid (2 × 5 = 10 entries)

Easy / Normal / Hard / Nightmare / Ultra Nightmare × 3-lives / Permadeath.

## Score model

body 100 · headshot 250 · justice-shot 200 · civilian -500 · combo cap 2.5×.

## Daily challenge

Fixed levels + UTC-date-seeded daily modifier from ~18-modifier pool.

## Out of scope

See `docs/ARCHITECTURE.md` "Out of scope (v1)" — same list.
