---
title: Testing
updated: 2026-04-30
status: current
domain: quality
---

# Testing

Test pyramid per `~/.claude/profiles/ts-browser-game.md`. **Tests reify spec lines** — each design-canon claim has an assertion.

| Layer | Runner | Scope | Path |
|---|---|---|---|
| Unit | Vitest (node) | pure logic — rail traversal, fire-program tick math, screenplay director state, score math | colocated `*.test.ts` next to the module |

The current canonical example is `src/rail/Rail.test.ts` (25 tests covering the camera-rail state machine).

## What we test

- **Rail state machine** (`src/rail/Rail.ts`) — segment math, dwell entry/exit, overflow handling, finished state, degenerate segments.
- **Spawn-rail traversal** (`src/encounter/SpawnRail.ts`) — same shape but for short waypoint paths.
- **Fire-program tape** (`src/encounter/EncounterDirector.ts`'s `tickEnemy`) — event emission ordering, per-difficulty mutation, pre-aggro hold.
- **Game state transitions** (`src/game/GameState.ts`) — start-run → damage → continue → game-over flow.

## What we do not test (yet)

- Visual regression (no `tests/visual/`). Babylon GUI rendering needs a real GPU surface; deferred until perf-pass.
- E2E (no Playwright). Adding once the playable run is stable end-to-end.
- Audio envelope tests. Web Audio determinism via `OfflineAudioContext` is sound but has no v1 hooks.

## CI mapping

`.github/workflows/ci.yml` runs `pnpm typecheck` + `pnpm lint` + `pnpm test:node`. Visual / browser tests are deferred — see "What we do not test (yet)".

## Forbidden

- `.skip(`, `.todo(`, `.fixme(`, `xtest(`, `xit(` — write the test or delete it.
- `TODO:`, `FIXME:`, `throw new Error('not implemented')` — fix or delete.
- `Math.random()`, `Date.now()` — gameplay is deterministic by design (no PRNG); tests use `performance.now()` only at run-start in `GameState.startRun`.
- Hand-edited baseline PNGs.
- `retries: N` on visual tests to mask flake.
