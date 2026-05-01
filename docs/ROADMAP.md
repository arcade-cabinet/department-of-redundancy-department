---
title: Roadmap
updated: 2026-05-01
status: current
domain: context
---

# Roadmap

DORD is a mobile-first arcade rail shooter (Time Crisis / House of the Dead / Virtua Cop lineage). v1 — single canonical run, 8 cubicle/stair levels + 1 boardroom boss arena, ~9 min on Normal — is **shipped to main**. INSERT COIN → 8 levels → boardroom → victory is end-to-end completable, gated by Playwright e2e at `tests/e2e/` and visual regression at `tests/visual/`.

What's pending is replay-loop polish, native-shell packaging, and content depth. There is no greenfield rebuild.

| Area | Status | Notes |
|---|---|---|
| Rail + camera + screenplay director | shipped | `src/rail/`, `src/encounter/` |
| 8 levels + boardroom boss arena | shipped | `src/levels/`, `docs/spec/levels/` |
| Weapons, reticle, fire→kill pipeline | shipped | gated by `tests/e2e/fire-kill.spec.ts` |
| Civilians + adaptive difficulty + combo | shipped | PR #56, #61 |
| Health-kits + canonical-run economy | shipped | PR #56, #58 |
| High-score table + persistence | shipped | PR #59, #60 |
| Insert-coin / continue / friend modal | shipped | PR #61 |
| Playwright e2e suite (canonical run + transitions + fire→kill + visual) | shipped | PRs #69–#72 |
| Capacitor android/ios scaffold | shipped | PR #61 |
| Native packaging (signing, store builds) | pending | see `docs/native-packaging.md` |
| Content depth (extra civilians, set-dressing variety, audio polish) | pending | per-level spec gaps in `docs/spec/levels/` |

## Out of scope (v1)

Multiplayer · skeletal animations · viewmodel-arms IK · day/night · outdoor biomes · procedural levels · mid-run shop · custom-mapped weapons · difficulty selector · daily challenge · modifier toggles (the last three were explicitly ripped in the canonical-run pivot — see `decisions.ndjson`).

## Where the work lives

- **Active queue:** `.agent-state/directive.md`. The directive is the source of truth for "what's next" — when its queue is drained, the project is at a breakpoint and needs a new directive from the user.
- **Per-level specs:** `docs/spec/levels/01-lobby.md` … `08-boardroom.md`.
- **Canon:** `docs/spec/00-overview.md` (game-in-one-paragraph), `04-construction-primitives.md` (level schema), `05-screenplay-language.md` (cue verb reference).
- **Decisions ledger:** `.agent-state/decisions.ndjson` (append-only, queryable via `ctx_search source:"decisions:department-of-redundancy-department"`).
