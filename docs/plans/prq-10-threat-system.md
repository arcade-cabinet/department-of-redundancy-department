# PRQ-10: Threat System + Higher-Tier FSMs

**Status:** queued

**Blocked by:** PRQ-09.

## Goal

Implement persistent Threat tracking, the spawn director that consults Threat per chunk-spawn, and the higher-tier enemy FSMs (Policeman, Hitman, SWAT, SWAT-squad) reusing the MiddleManager FSM as a base. After this PRQ: killing managers escalates Threat → policemen appear → killing them faster pulls in hitmen, then SWAT, then SWAT squads.

## Spec reference

§ 10 Threat system (locked), § 7 AI / Yuka pathfinding (locked) — non-manager rows.

## Success criteria

- `world_meta.threat: number` persists; per-event delta + idle decay per spec §10.
- Spawn director runs on chunk-enter (per-floor, since alpha is one-floor-loop): consults threat, samples spawn pool.
- Police FSM extends MiddleManager: + `CallBackup` (at half HP triggers spawn of 1 manager + 1 police if Threat allows).
- Hitman FSM: + `Stealth` (crouch-equivalent slow walk, harder to perceive — Vision range halved on player when hitman in `Stealch`); + `Strike` (one decisive hitscan, then `Evade`); + `Evade` (`EvadeBehavior`, route to corner of nearest cubicle).
- SWAT FSM: + `Suppress` (sustained fire, longer engage window) + `Flank` (Goal arbitration via `yuka.GoalEvaluator` choosing flank vs pursue).
- SWAT-squad: 2–3 SWAT instances sharing a single `MemoryRecord` registry (group memory).
- HUD threat strip animates with `--auditor-red` fill; crosses tier thresholds with a `_tick` animation pulse.
- Browser test covers tier escalation: spawn 5 managers → kill all → assert next spawn pool includes police.
- E2E: kill 2 managers → assert 1 police spawns next chunk-enter; kill faster → hitman appears.

## Task breakdown

### T1: Threat repo + decay tick

**Files:** `src/db/repos/world.ts` (extend), `src/combat/threat.ts`, `src/combat/threat.test.ts`.

`world.getThreat()`, `world.setThreat(v)`. `applyKillEvent(slug)` adds spec §10 Δ. Idle decay: `world.tickThreat(deltaSec)` subtracts `0.05 / 60 * deltaSec` per minute. Floor-enter event: `-0.5`.

**Acceptance:** node tests cover all events.

### T2: Spawn director

**Files:** `src/ai/enemies/spawnDirector.ts`.

`pickSpawnSet(threat: number, count: number, rng: Mulberry32): { slug: string }[]`. Implements the spawn pool table from spec §10. Called by floor-spawn (PRQ-08 spawner) and on demand from `CallBackup`.

**Acceptance:** node tests cover each tier band.

### T3: Police FSM

**Files:** `src/ai/enemies/Policeman.ts`, `src/ai/enemies/PolicemanFSM.ts`.

Extends `MiddleManager` (refactor PRQ-08 to make FSM extension-friendly: extract `BaseEnemyFSM` shared base). Policeman vision 120°/18u; speed 1.1×; HP 50; baton-tase hitscan 14 dmg/1.5s. `CallBackup` at HP=25: emits a `request-backup` event consumed by the spawn director to add 1 manager + (if threat≥4) 1 police at the nearest patrol cell.

**Acceptance:** unit tests for `CallBackup`; visual smoke renders.

### T4: Hitman FSM

**Files:** `src/ai/enemies/Hitman.ts`, `src/ai/enemies/HitmanFSM.ts`.

HP 25; speed 1.4×; stealth slow walk 0.6×; vision 60°/24u (long range, narrow). `Stealth` → walk softly (player vision range halved against him while in this state); `Strike` → 22 dmg silenced-stapler hitscan; `Evade` → `EvadeBehavior` to a corner.

**Acceptance:** node tests cover state transitions; browser smoke verifies stealth speed.

### T5: SWAT FSM

**Files:** `src/ai/enemies/Swat.ts`, `src/ai/enemies/SwatFSM.ts`, `src/ai/enemies/SwatGoals.ts`.

HP 80; speed 1.0× w/ strafe (random ±90° micro-paths during engage); vision 100°/16u; frag-stapler grenade — kinematic projectile w/ 1u radius AOE, 30 dmg. Goal arbitration via `yuka.GoalEvaluator`: `PursueGoal`, `FlankGoal`, `SuppressGoal`. Each goal computes desirability; highest wins.

**Acceptance:** unit tests on goal evaluators; browser smoke verifies flank path.

### T6: SWAT squad shared memory

**Files:** `src/ai/perception/squadMemory.ts`.

`SquadMemory` registry; vehicles in same squad write to / read from a single `MemoryRecord`. Squad spawned together by spawn director (`{ slug: 'swat-squad', size: 2..3 }`).

**Acceptance:** node test: one squad member sees player → all squad members have player in memory next tick.

### T7: Threat strip animation

**Files:** `src/ui/chrome/ThreatStrip.tsx` (extend from PRQ-09).

Subscribe to threat changes; Framer Motion spring on fill; tier-cross pulse animation when threat crosses 2.0/4.0/5.0/8.0.

**Acceptance:** browser snapshot test at three threat values passes.

### T8: Audio cues per tier

**Files:** `src/combat/sfx-stubs.ts` (extend).

Emit `audio:spawn(slug)` events; full wiring in PRQ-15.

**Acceptance:** event emitted on each spawn.

### T9: E2E escalation

**Files:** `e2e/threat-escalation.spec.ts` (`@golden`).

Boot → kill 2 managers → leave + re-enter chunk → assert next spawn includes 1 police; continue killing → 1 hitman appears; etc.

**Acceptance:** green.

### T10: PR + merge

PR: `feat(ai): threat system + Police/Hitman/SWAT/SWAT-squad FSMs (PRQ-10)`. Squash-merge after `validate-deployed` green.

## Notes

HR Reaper (boss) is intentionally deferred to PRQ-13 since it's gated to multiples-of-5 floors and needs the floor-transition infra from PRQ-12.
