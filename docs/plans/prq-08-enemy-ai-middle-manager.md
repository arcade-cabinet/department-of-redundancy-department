# PRQ-08: Enemy AI — Middle Manager

**Status:** queued

**Blocked by:** PRQ-07.

## Goal

Implement the first enemy archetype end-to-end: middle-manager FSM with perception (vision cone + BVH-LOS), steering (obstacle-avoid + follow-path), engagement (hitscan attack on player), hit/death feedback. Three managers spawn on floor 1, patrol cubicle banks, alert on LOS, engage and die. After this PRQ: floor 1 has live combat against a single archetype.

## Spec reference

§ 7 AI / Yuka pathfinding (locked) — middle-manager row, § 19 §19.2 (gameplay bar — ≥3 managers per floor, FSM, hop-walk death).

## Success criteria

- `EntityManager` (`src/ai/core/entityManager.ts`) wraps a `yuka.EntityManager`, ticked from R3F `useFrame` at logic-tick cap (30Hz mobile / 60Hz desktop).
- Each enemy is a `yuka.Vehicle` + `SteeringManager` with `ObstacleAvoidanceBehavior` + `FollowPathBehavior`.
- Perception: `Vision` (cone 90°/12u for managers) + `MemoryRecord`; LOS check via `three-mesh-bvh` raycast against world chunks (capped at 5Hz cadence).
- FSM states: `Idle → Patrol → Investigate → Engage → Reposition → Death`. Implemented as `yuka.StateMachine`.
- Engage: face player, fire hitscan at 1Hz, accuracy 60% (random spread). Damage = 8 HP per hit. Player has 100 HP.
- On death: drop `binder-clips` (ammo, +5) or `coffee` (heal, +20) by 50/50 roll.
- 3 managers spawn at random cubicles per floor, deterministic from `(seed, floor)`.
- HUD shows player HP (approval-green bar) + damage flash; on HP=0, route to `app/views/GameOver.tsx` (placeholder UI).
- E2E: enter floor 1, kill 3 managers, no errors, kills counter increments to 3.

## Task breakdown

### T1: EntityManager + tick driver

**Files:** `src/ai/core/EntityManager.tsx`.

Singleton koota resource holding a `yuka.EntityManager`. R3F `useFrame` calls `manager.update(dt)` at 30Hz mobile / 60Hz desktop (frame-skip if needed).

**Acceptance:** node test: register 5 stub vehicles, tick 100 times, no errors.

### T2: BVH-LOS perception

**Files:** `src/ai/perception/los.ts`, `src/ai/perception/Vision.ts`.

`hasLineOfSight(from: Vec3, to: Vec3, world: ChunkLayer): boolean` — raycast via the per-chunk BVH from PRQ-03. `Vision` is a `yuka.GameEntity` extension with cone (`fov`, `range`); `senseEntities(target)` returns `{ visible, lastSeenAt }`.

**Acceptance:** browser test in a chunk with a wall between A and B: `hasLineOfSight` is false; remove the wall: true.

### T3: MiddleManager Vehicle + steering

**Files:** `src/ai/enemies/MiddleManager.ts`.

Subclass of `yuka.Vehicle`. `SteeringManager` with `ObstacleAvoidanceBehavior` (radius 0.6u) + `FollowPathBehavior`. Walk speed 1.0u/s, run speed 1.8u/s. Health 30.

**Acceptance:** node test: vehicle with a 5-segment path arrives at goal in <expected ticks; obstacle-avoid bends path around an inserted obstacle.

### T4: FSM states

**Files:** `src/ai/enemies/MiddleManagerFSM.ts`.

Each state implements `yuka.State` (`enter`/`execute`/`exit`):
- `Idle` — stand at desk; transition to `Patrol` after 2–4s random.
- `Patrol` — pick random walkable cell within 8u; FollowPath; on arrival, back to `Idle`.
- `Investigate` — entered when MemoryRecord has `lastSeenAt < 3s` and not currently visible; FollowPath to last-known position; if `senseEntities` finds player → `Engage`; else after 5s → `Patrol`.
- `Engage` — face player; fire hitscan at 1Hz; reposition every 4s (Reposition state); if LOS lost > 3s → `Investigate`.
- `Reposition` — pick a cell 3–6u from current position, still within engagement range of player; FollowPath; back to `Engage` on arrival.
- `Death` — drop pickup; trigger `<Character state="death"/>`; despawn after 1.5s.

**Acceptance:** node tests cover each transition.

### T5: Hitscan damage system

**Files:** `src/combat/hitscan.ts`, `src/combat/damage.ts`, `src/ecs/components/Health.ts`.

`fireHitscan(from, dir, range, damage, accuracy)`: BVH raycast against world + dynamic actors; if first hit is the player → apply damage. Spread = `accuracy=0.6` → ±5° random cone. Player Health component has `current`, `max`, `damageFlashTimer`.

**Acceptance:** node test: at accuracy 1.0, hitscan hits the target; at 0.0, miss → world wall hit only.

### T6: Spawner

**Files:** `src/ai/enemies/spawner.ts`.

On floor enter (PRQ-12 will trigger; for PRQ-08, mount on `<Game/>`): generate 3 spawn cells deterministically from `(seed, floor)`; instantiate 3 `MiddleManager` vehicles; register with `EntityManager`.

**Acceptance:** dev-mode floor spawn shows 3 managers; reload → same positions.

### T7: HUD HP bar (placeholder)

**Files:** `src/ui/chrome/HpBar.tsx`. Polished in PRQ-09.

Bottom-left fixed-position div, approval-green fill, paper background, percentage from Health component.

**Acceptance:** taking damage drains the bar.

### T8: Game-over routing

**Files:** `app/views/GameOver.tsx` (placeholder), `app/shell/Routes.tsx` (add `'gameover'` view).

On `Health.current <= 0` → emit `gameover` event → `Routes.tsx` switches view → simple "YOU HAVE BEEN TERMINATED" + Restart button.

**Acceptance:** death routes correctly; Restart resets the game.

### T9: VisionConeViz debug overlay

**Files:** `src/verify/VisionConeViz.tsx`. Toggle `?debug=vision`.

Renders cone for each enemy (color = white when not seeing, auditor-red when seeing).

**Acceptance:** dev mode shows cones tracking player.

### T10: E2E combat

**Files:** `e2e/combat-prq08.spec.ts` (`@golden`).

Boot → enter floor 1 → kill 3 managers via dev-mode "instakill" debug action (gameplay verified, not skill-tested) → assert `world_meta.kills` row for `middle-manager` shows 3.

**Acceptance:** green.

### T11: PR + merge

PR: `feat(ai): middle-manager FSM + perception + steering + hitscan + spawner (PRQ-08)`. Squash-merge after `validate-deployed` green.

## Notes

Higher-tier enemy FSMs (police, hitman, swat, reaper) reuse the MiddleManager FSM as a base class in PRQ-10. Keep the FSM small and override-friendly.
