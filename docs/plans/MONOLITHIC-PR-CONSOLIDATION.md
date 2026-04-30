# Monolithic PR Consolidation Plan

**Author:** Claude (autonomous loop) **Date:** 2026-04-30

## Background

CodeRabbit rate-limited at PR #19 (PRQ-12). Root cause: **too many PRs with too little internal review per PR.** PRQ-08 through PRQ-12 each shipped as a separate PR within hours, each hitting the reviewer pipeline. Result: external reviewers (CodeRabbit) cannot keep up; their hourly cap blocks merges; each blocked PR forces a fold-forward commit, which compounds the problem.

The directive's existing rule was right — *"one long-running branch per topic, one commit per task"* — but in practice each PRQ became its own topic. We need to **collapse PRQs into multi-PRQ topic branches** that absorb review pressure with the internal reviewer trio (`comprehensive-review:full-review` + `security-scanning:security-sast` + `code-simplifier`) before CodeRabbit ever sees the work.

## Cohesion analysis — what actually couples to what?

I read every remaining plan and traced its inputs/outputs. Coupling falls into four obvious clusters:

| Cluster | What it is | Why these belong together |
|---|---|---|
| **WORLD-LOOP** | PRQ-12 (already in flight), PRQ-13 (HR Reaper boss), PRQ-17 e2e of stairwells | Stairwells are useless without the boss-gate that makes the gate matter. The e2e validates the loop. All three touch `Door`/`floor swap`/`current_floor` mechanics. |
| **PRESENTATION** | PRQ-14 (UI surfaces), PRQ-15 (audio), PRQ-07 deferred screenshot, PRQ-09 deferred projectile R3F + audio cues, PRQ-10 deferred archetype mounts, PRQ-11 deferred placement R3F, PRQ-12 deferred Door/Transition + PlayerController wiring | Every PRQ from 07 onward has deferred presentation work. They all share the same surface (R3F mounts + chrome + audio events) and were intentionally deferred together to protect against visual regressions. Collapse them into one giant "skin" PR. |
| **SHIP-PREP** | PRQ-16 (mobile shell), PRQ-17 (golden e2e), PRQ-18 (perf pass) | Mobile shell, e2e, and perf are all the *deployment surface*. Perf budgets are validated by the same e2e infrastructure. Mobile shell is meaningless without the e2e to prove it boots. |
| **BETA-CONTENT** | PRQ-B0 (weapons), PRQ-B1 (recipes), PRQ-B2 (floor archetypes), PRQ-B3 (traps), PRQ-B6 (damage zones), PRQ-B7 (enemy variants), PRQ-B8 (skill gates) | Pure content + tag-driven mechanics. All read JSON, all add koota tags, all flow through PRQ-09's Equipped + PRQ-08's BaseEnemyFSM + PRQ-11's place/mine. Zero new infra. |
| **BETA-POLISH** | PRQ-B4 (audio polish), PRQ-B5 (tracery), PRQ-B9 (mobile UX) | Refinement passes on already-shipped systems. |
| **RC-HARDENING** | RC0 perf, RC1 a11y, RC2 saves, RC3 visual, RC6 rc-e2e | Cross-cutting hardening; all need every other RC item to land first. Best as one branch, sequenced internally. |
| **RC-RELEASE** | RC4 native packaging, RC5 localization, RC7 release process | Pure release engineering, no game-code touches. |

## Proposed collapse: 25 PRQs → 7 monolithic PRs

### M1: WORLD-LOOP (PRQ-12 logic + PRQ-13)

**Status:** PRQ-12 logic IS in flight as PR #19. Land it as-is to free CodeRabbit. Then PRQ-13 starts in a NEW topic branch `world-loop-v2` and absorbs the deferred PRQ-12 R3F items (Door.tsx, Transition.tsx, PlayerController wiring, e2e for transitions) **as part of the same branch** — squash-merged once.

**Inside the branch:** four commits — (1) PRQ-12 deferred R3F mounts + PlayerController, (2) PRQ-13 Reaper FSM + spawn rule, (3) PRQ-13 R3F mount + door-lock overlay, (4) e2e for boss-gate + stairwell. Internal reviewer trio between every commit. ONE PR opened only after all four are clean.

**Why the change:** keeps the boss-gate work paired with the door visual it depends on. Avoids a "PRQ-12 R3F" PR that's awkwardly half a feature.

### M2: PRESENTATION (PRQ-07/09/10/11/12 deferred + PRQ-14 UI surfaces + PRQ-15 audio)

**The big one.** Every deferred presentation item from earlier PRQs collapses here, alongside PRQ-14 and PRQ-15. Branch `presentation-skin`.

**Sub-commits, ordered by dependency:**

1. Tokens + fonts (PRQ-14 baseline) — required by every chrome that follows.
2. PRQ-07 character grid + PRQ-10 archetype mounts (`Policeman.tsx`, `Hitman.tsx`, `Swat.tsx`) — same `<Character>` swap surface.
3. PRQ-09 projectile R3F + spawn-on-death pickup R3F + PRQ-11 PlacedStructure mount — all use the same drei `<Instances>` story.
4. PRQ-12 deferred Door.tsx + Transition.tsx + PlayerController tap→door routing (if M1 didn't already absorb this — depends on M1 ordering).
5. PRQ-14 EmployeeFile + PauseMenu (Stats/Settings/Journal) + GameOver — Radix Tabs + framer-motion, single typography system.
6. PRQ-14 Landing uplift (HDRI hero, lights-flicker, ambient hum hook) — depends on font load.
7. PRQ-15 GlobalAudio + AudioManager + AudioBackground — wires every `audio:*` event from earlier PRQs to a real source. Also the iOS unlock gesture on Landing.
8. Visual snapshot baseline pass.

**Reviewer trio runs after every commit.** No fold-forward "fix-review" commits. The branch can live for a week internally. Only when all 8 are green and the snapshot baseline matches the spec do we open ONE PR.

**Risk this addresses:** the user said *"VERY careful to make SURE this doesnt create vishal trals refressions etc"* during PRQ-11. Collapsing all deferred R3F into one branch means we pay the visual-regression test cost ONCE and verify ONCE.

### M3: SHIP-PREP (PRQ-16 + PRQ-17 + PRQ-18)

Branch `ship-prep`.

1. PRQ-17 golden-path e2e first (it gates everything else).
2. PRQ-18 perf pass — uses the e2e's deterministic-seed floor for the FPS assertion.
3. PRQ-16 mobile shell — Capacitor 8 iOS + Android. Native SQLite verification uses the same e2e fixture.
4. `validate-deployed` job in `cd.yml` — the live-Pages check.

**Why the order flip from the directive:** PRQ-18 currently lives after PRQ-17. But PRQ-16 (mobile) lives BEFORE PRQ-17 in the directive — that's wrong. You can't author a meaningful golden-path e2e for mobile before mobile boots. Re-ordered: e2e infrastructure → perf → mobile shell, with the mobile shell e2e as the final commit.

### M4: BETA-CONTENT (PRQ-B0/B1/B2/B3/B6/B7/B8)

Branch `beta-content`. All are content + tag-driven. Single PR.

1. B0 weapons.json roster (data-only on top of PRQ-09's loader).
2. B6 damage zones (math-only on top of PRQ-08's hitscan).
3. B7 enemy variants (tag table; reuses PRQ-08 + B0).
4. B2 floor archetypes (generator config — same generateFloor signature, archetype param).
5. B1 recipe discovery (Supply Closet bench surface; uses PRQ-04 inventory).
6. B8 skill gates (predicate around `place()` from PRQ-11).
7. B3 traps integration (last — depends on B0 turret-rewire).

### M5: BETA-POLISH (PRQ-B4 + PRQ-B5 + PRQ-B9)

Branch `beta-polish`. Three small refinements.

1. B5 Tracery narrator (string-only).
2. B4 Audio polish (subscribes more cues).
3. B9 Mobile UX (tap targets, safe-area, haptics).

### M6: RC-HARDENING (RC0 + RC1 + RC2 + RC3 + RC6)

Branch `rc-hardening`. Single PR but bigger. Ordered internally:

1. RC0 perf hardening (extends M3's PRQ-18 work).
2. RC1 a11y (WCAG-AA contrast pass; uses M2's tokens).
3. RC2 save robustness (corruption recovery, export/import).
4. RC3 visual polish.
5. RC6 RC e2e (5-floor content run; extends M3's golden path).

### M7: RC-RELEASE (RC4 + RC5 + RC7)

Branch `rc-release`. Pure release engineering.

1. RC5 localization scaffold (string extraction; landing now goes through i18n).
2. RC4 native packaging (signing keys, store metadata).
3. RC7 release-please workflow + tagged releases to TestFlight + Play Internal.

## What this gets you

| Metric | Before | After | Δ |
|---|---|---|---|
| Total PRs across remaining 25 PRQs | 25 | 7 | **−72%** |
| External-reviewer (CodeRabbit + Gemini) hits per shipped feature | high — every PRQ | one per topic | **rate-limit pressure goes away** |
| Internal reviewer trio runs | per-PRQ | per-commit-within-branch | **same depth, no churn** |
| Visual-regression test cost | paid every PRQ | paid once per topic | **5× cheaper for M2** |
| Time-to-merge after CI green | 5–15 min (CodeRabbit re-review per fold-forward) | 0 min (CodeRabbit not re-blocking) | **eliminates the queue** |
| Lines of diff per PR | small | very large for M2 (~2k–4k LOC) | trade — accept it |

## Hard rules that don't change

1. **Internal reviewer trio runs after every commit inside a topic branch.** The branch-level discipline replaces the PR-level discipline. CodeRabbit gets ONE high-quality review per topic, not ten interrupted attempts.
2. **No fold-forward commits to fix internal-review findings.** If the trio flags something, fix it in the next forward commit AS DESIGNED, never amend.
3. **Stubs / TODOs / `as any` are still bugs.** No "ship it now, fix later" inside a topic branch.
4. **Wait-state items in the directive get `[WAIT]`/`[WAIT-REVIEW]`** so the stop-hook recognizes legitimate yields.
5. **Refactors not shims.** When a module moves inside a topic branch, every caller moves with it in the same commit.
6. **Beta still blocked by alpha gate.** RC still blocked by beta gate. Spec §19/§22.2/§22.3 unchanged.

## What I am proposing to do RIGHT NOW

1. **Land PRQ-12 PR #19** (already in flight, just need CodeRabbit's re-review window to clear).
2. **Stop opening one PR per PRQ.** Switch to the M1–M7 branching plan above.
3. **Update `.agent-state/directive.md`** to reflect the M-grouping. The PRQ list stays as the unit of *internal* tracking; the M-list is the unit of *PR* tracking.
4. **Start M1 (`world-loop-v2`)** as the next branch. PRQ-13 + PRQ-12 deferreds together, four internal commits, ONE PR.

## Open question for human partner

M2 (PRESENTATION) is the biggest bet. It's a 2k–4k LOC PR. CodeRabbit might still rate-limit even on a single big PR (it reviews per file, not per PR). Two ways to handle that:

- **(A) Accept the giant PR.** Internal reviewer trio absorbs everything; CodeRabbit is best-effort.
- **(B) Split M2 into M2a (R3F mounts only) and M2b (UI + audio).** Two PRs instead of one, but still 6 fewer than the status-quo 7 PRQs.

I lean (A) — the user's directive explicitly says "minimize PR churn, maximize local review velocity." (B) is a hedge that still beats status quo. Defer the call until M1 lands and we see the M2 LOC actual.
