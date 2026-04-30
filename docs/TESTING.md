---
title: Testing
updated: 2026-04-30
status: current
domain: quality
---

# Testing

Test pyramid per `~/.claude/profiles/ts-browser-game.md`. **Specs reify spec lines** — each design-canon claim has an assertion.

| Layer | Runner | Scope | Path |
|---|---|---|---|
| Unit | Vitest (node project) | pure logic — rail traversal, score math, beat timelines, RNG | `tests/unit/`, colocated `*.test.ts` |
| Browser | Vitest (browser project, Playwright Chromium) | R3F components, BVH raycast, Rapier collisions | `tests/browser/` |
| E2E | Playwright | full-run journeys — Lobby → Boardroom | `tests/e2e/` |
| Visual | Playwright `toHaveScreenshot` | reticle states, HUD, level frames | `tests/visual/__screenshots__/` |
| Audio | Vitest browser + `OfflineAudioContext` | per-cue envelope, timing | `tests/audio/` |

Harness scenes (`tests/harness/`) hold deterministic single-element scenes for visual regression — one HUD panel, one beat, one reticle state.

## CI mapping

`.github/workflows/ci.yml` runs four jobs: `core` (typecheck + lint + node tests), `browser`, `e2e-smoke`, `bundle-size`.

## Lockdown protocol (active until Phase 4 lift gate)

While the OOM lockdown is active per `.agent-state/directive.md`, only `pnpm typecheck` + `pnpm lint` + `pnpm test:node` run locally. `pnpm test:browser` and any `pnpm dev` / headed playwright are forbidden. Lift criteria are in the directive.

## Determinism rules

1. Seed all RNG via `createRng(seed)` from `src/shared/rng.ts`. Engine accepts `?seed=N`.
2. Fixed timestep — `?frame=N` advances exactly N 60Hz ticks.
3. Animations disabled in test mode (Playwright `animations: 'disabled'` + engine-level tween gating).
4. Wait for fonts: `await page.evaluate(() => document.fonts.ready)`.
5. Mask volatile regions (FPS counters, timestamps) via `mask:` in `toHaveScreenshot`.
6. `retries: 0` for visual tests locally — flake means determinism is broken.

## Forbidden

- `.skip(`, `.todo(`, `.fixme(`, `xtest(`, `xit(`
- `TODO:`, `FIXME:`, `throw new Error('not implemented')`
- `Math.random()`, `Date.now()`, `performance.now()` outside the engine clock/RNG facade
- Hand-edited baseline PNGs (regenerate via `--update-snapshots`, eyeball the diff)
- `retries: N` on visual tests to mask flake
