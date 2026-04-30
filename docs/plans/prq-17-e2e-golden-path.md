# PRQ-17: E2E Golden Path

**Status:** queued

**Blocked by:** PRQ-16.

## Goal

Author the comprehensive Playwright golden-path spec that exercises every alpha system from boot to floor-2 arrival. Wires the live-deploy validation into `cd.yml`. After this PRQ: a green `validate-deployed` job on `main` is *strong* evidence the alpha works end-to-end on the deployed Pages URL.

## Spec reference

§ 13 Testing, § 19 Alpha definition-of-done — all of §19.1–§19.5.

## Success criteria

- `e2e/golden-path.spec.ts` covers: boot → Landing renders → CLOCK IN → spawn on floor 1 → tap-to-travel → kill 1 manager via Three-Hole Punch → mine 1 desk (acquire planks) → place 1 staircase → climb stair → mine ceiling → drop through shaft (fall damage applied) → walk to Up-Door → enter → arrive on floor 2 → assert state via DB read.
- `e2e/perf.spec.ts` asserts ≥45 fps for a deterministic 30s on a fixed-seed floor.
- All visual snapshots from earlier PRQs roll up into a final baseline pass.
- `cd.yml` `validate-deployed` job runs the `@golden` + `@perf` tags against the live `page_url`.
- Total e2e runtime ≤ 10 min on CI.

## Task breakdown

### T1: Test fixture utilities

**Files:** `e2e/fixtures/{boot,player,combat,building,floor}.ts`.

Reusable helpers: `bootGame(page, { seed: 0, floor: 1 })`, `tapTravel(page, { x, z })`, `equipWeapon(page, slug)`, `tapEngage(page, enemyTestId)`, `holdRadial(page, { x, y, z })` returning available options, `pickRadial(page, optionId)`. Each uses `data-testid` attributes added in earlier PRQs (sweep + add any missing).

**Acceptance:** browser test confirms each fixture works against the live game.

### T2: Golden-path spec

**Files:** `e2e/golden-path.spec.ts`.

Use the fixtures to compose the full sequence above. Assert post-conditions via koota state introspection (`window.__dord.world.get(...)`) where DOM doesn't expose them — but only via a debug-only namespace gated on `?test=1`.

**Acceptance:** local run (`pnpm test:e2e:ci`) green; CI run green.

### T3: Perf spec

**Files:** `e2e/perf.spec.ts`.

Boot at fixed seed, force-spawn 5 managers (debug action), measure FPS via `performance.now()` deltas across 30s. Assert mean ≥45 and p95 frame time ≤22ms.

**Acceptance:** local + CI green; a deliberate perf regression in a draft PR fails the spec.

### T4: Pixel snapshots final baseline

**Files:** `e2e/__snapshots__/*` regenerated.

Sweep every visual snapshot test added in PRQ-02/07/12/13/14; `npx playwright test --update-snapshots` to commit final baselines.

**Acceptance:** subsequent runs without source changes are zero-diff.

### T5: Live deploy job

**Files:** `.github/workflows/cd.yml` (already has `validate-deployed` from PRQ-00; verify it picks up the new specs).

Confirm `DORD_BASE_URL` propagation works; confirm artifacts (screenshots on failure) are uploaded.

**Acceptance:** an intentional break to landing copy → `validate-deployed` red on the resulting `cd.yml` run.

### T6: PR + merge

PR: `test(e2e): full alpha golden path + perf gate (PRQ-17)`. Squash-merge after `validate-deployed` green.

## Notes

After this PRQ, the alpha gate from §19.5 is fully automated — agent should not declare alpha complete without a green `validate-deployed` on the merge commit.
