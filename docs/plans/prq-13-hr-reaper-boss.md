# PRQ-13: HR Reaper Boss + Every-5-Floors Gate

**Status:** queued

**Blocked by:** PRQ-12.

## Goal

Implement HR Reaper as the floor-5 (and every 5th-floor) boss. The Reaper is the only character with auditor-amber emissive (Gojo Satoru GLB tinted). Single, unkillable-feeling fight: 600 HP, teleport-to-max-aggro on cooldown, debuff-on-hit (slow + blurred vision). Defeating it is mandatory to use the Up-Door of that floor; the door is locked until Reaper is dead.

## Spec reference

§ 0 (HR Reaper roster), § 3.4 (`hr-reaper` slug), § 22.1 (alpha must include HR Reaper since alpha closes the loop).

## Success criteria

- `hr-reaper` GLB (PRQ-01 output) used as-is.
- On entering a floor where `current_floor % 5 === 0`: skip normal spawn; spawn 1 Reaper at the supply closet position; lock the Up-Door with a stamped overlay `BLOCKED — PENDING REVIEW`.
- Reaper FSM: extends `BaseEnemyFSM`; states `Idle → Engage → Teleport (cooldown 12s) → Engage`. Vision 360°/30u (always sees player on the floor).
- Teleport: pick a walkable cell within 8u of player but not within 2u; teleport instantly with a 1s windup + 0.5s cooldown.
- Attack: 30 dmg auditor-pen hitscan, 1.5s cadence; spawns a 0.6u-radius "redaction" AOE on player's last position.
- On player hit: apply `Debuffed` for 4s — speed × 0.6, camera blur via post-FX (drei `<Effects/>` with a chromatic aberration bump).
- On Reaper death: door unlocks; Reaper drops a `floor-key` pickup that's animated rising into the player; threat resets to 0.
- E2E: trigger floor 5 (force `current_floor=5` via dev hook), beat Reaper using Three-Hole Punch + Stapler combo, door unlocks, ascend to floor 6.

## Task breakdown

### T1: Reaper FSM

**Files:** `src/ai/enemies/HrReaper.ts`, `src/ai/enemies/HrReaperFSM.ts`.

Vehicle with no path-following (teleport-only). HP 600. Vision 360°/30u. States `Idle | Engage | TeleportWindup | TeleportCooldown`. Hitscan cadence 1.5s with auditor-pen 30 dmg.

**Acceptance:** unit tests on transitions; browser smoke renders the Reaper at scale 1.5×.

### T2: Teleport mechanic

**Files:** `src/ai/enemies/HrReaperFSM.ts` (above).

`Teleport` algorithm: `pickTeleportCell(reaperPos, playerPos, navMesh)` → walkable cells within 8u of player; filter to ≥2u from player; randomly choose. Emit `teleport-vfx` event for a brief auditor-amber flash at source + destination.

**Acceptance:** node test: 100 random teleport picks all satisfy the constraints.

### T3: Debuff system

**Files:** `src/ecs/components/Debuffed.ts`, `src/render/effects/BlurOverlay.tsx`, `src/combat/debuffs.ts`.

`Debuffed` component with `endAt: number, kind: 'reaper-redaction'`. Speed multiplier applied in PlayerController; blur overlay applied via drei post-processing chromatic aberration spike (only when present).

**Acceptance:** node test: speed × 0.6 while debuff active; clears after 4s.

### T4: Floor 5 gate

**Files:** `src/world/floor/bossGate.ts`, `src/ai/enemies/spawnDirector.ts` (extend).

On floor enter: if `current_floor % 5 === 0`, set Up-Door state `locked: true`, spawn 1 Reaper. On Reaper death: unlock door, spawn `floor-key` at Reaper's last position, set `world_meta.threat = 0`.

**Acceptance:** browser test: dev-set `current_floor=5`, enter chunk, assert Up-Door tile carries `locked` overlay and Reaper is in scene.

### T5: Locked-door overlay UI

**Files:** `src/render/stairwells/Door.tsx` (extend).

When `locked === true`, render a stamped `BLOCKED — PENDING REVIEW` overlay over the door (Departure Mono, auditor-red ink). Tap is no-op while locked, plays `audio:locked-door` cue stub.

**Acceptance:** browser snapshot of locked + unlocked door.

### T6: Floor-key pickup

**Files:** `src/combat/pickups.ts` (extend).

`floor-key` pickup auto-collects when player walks within 1u; visually rises from ground over 0.6s with a Framer Motion spring; on collect → emit `audio:reaper-defeated` cue stub; door becomes openable.

**Acceptance:** browser test confirms pickup and door unlock.

### T7: E2E boss flow

**Files:** `e2e/reaper-boss.spec.ts` (`@golden`).

Boot → dev-set floor=5 → boss spawns → tap-engage with Three-Hole Punch → after sufficient damage → Reaper dies → door unlocks → enter Up-Door → arrive on floor 6.

**Acceptance:** green (timing-tolerant — use dev-mode damage multiplier ×10 so the fight wraps in <30s for CI).

### T8: PR + merge

PR: `feat(ai): HR Reaper boss + floor-5 gate (PRQ-13)`. Squash-merge after `validate-deployed` green.

## Notes

The Reaper's `BlurOverlay` is the only post-processing effect in alpha. Mobile cost: profile in PRQ-18; if it's >2ms/frame on iPhone 12, swap for a simpler vignette.
