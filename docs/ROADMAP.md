---
title: Roadmap
updated: 2026-04-30
status: current
domain: context
---

# Roadmap

Six phases. Each ships as ONE squash-merged PR. Per-PRQ status is tracked in TaskList; this file is the high-level pointer.

Authoritative source: [`docs/superpowers/plans/2026-04-30-arcade-rail-shooter-build.md`](./superpowers/plans/2026-04-30-arcade-rail-shooter-build.md).

| Phase | Goal | PRQs | Status |
|---|---|---|---|
| 1 — Vertical slice | rail + camera + 1 weapon + 1 enemy + 1 beat (door-burst). Headless playable | 1.0–1.10 | active |
| 2 — Skill expression | cover + reticle + 5 beats + civilians | 2.0–2.9 | pending |
| 3 — Game-loop layer | scoring + combo + UI shell + difficulty grid | 3.0–3.8 | pending |
| 4 — Demo content | Lobby + Stair A + Boardroom + Reaper. **OOM lockdown lift gate after.** | 4.0–4.10 | pending |
| 5 — Full canonical run | Open Plan, Stairway B, HR, Stairway C, Executive + mini-bosses | 5.0–5.18 | pending |
| 6 — Replay loop + ship | difficulty selector, daily challenge, leaderboards, polish | 6.0–6.15 | pending |

## Lockdown protocol (active)

Triggered by 2026-04-30 host OOM crash. `pnpm dev` / browser-mode tests / headed playwright are banned until end of Phase 4. Lift criteria + lift gate are in `.agent-state/directive.md`.

## Out of scope (v1)

Multiplayer · skeletal animations · viewmodel-arms IK · day/night · outdoor biomes · procedural levels · mid-run shop · custom-mapped weapons.
