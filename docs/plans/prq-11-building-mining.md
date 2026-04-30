# PRQ-11: Building + Mining

**Status:** queued

**Blocked by:** PRQ-10.

## Goal

Wire the tap-and-hold radial menu to actual block placement, mining (with tool-affinity timing), staircase placement (Staircase1/Staircase2 GLBs), and vertical shaft drops with falling damage. After this PRQ: player can re-architect the floor — mine a desk for planks, place stairs, dig through the floor to drop into a sub-cell.

## Spec reference

§ 4 Vertical traversal (player-built stairs + holes), § 5 Input (radial menu options), § 19 §19.2 (place / mine / staircase / shaft drop bars).

## Success criteria

- Radial menu actions wired: floor-block `Place Block / Place Stairs / Place Desk / Place Terminal / Cancel`; world wall `Mine / Cancel`; placed wall `Mine / Reinforce / Place Sign / Cancel`; desk `Search Drawer / Mine for Planks / Climb On / Cancel`.
- `place(blockSlug, position)` writes to ChunkData → marks dirty → triggers chunk remesh + navmesh regen.
- `mine(position)` requires equipped tool with matching `toolAffinity` (paper/plastic/metal). Mining time = `block.baseTime / tool.affinityMultiplier`. Holding the action with a non-matching tool is 4× slower but still works (simple Stapler-mines-everything fallback).
- `placeStaircase(slug, position, rotation)` places the corresponding GLB as a static-collider structure (Rapier `RigidBody type="fixed"`) — visible immediately; player can walk up.
- Mining a floor block: opens vertical shaft; player can drop through. Fall damage = `clamp((dropHeight - 3) * 8, 0, 100)`.
- All placements + minings persist via PRQ-04's structures + chunks repos.
- E2E: mine 1 desk → get 4 planks → place 1 staircase → climb top → mine ceiling → fall back through shaft.

## Task breakdown

### T1: Radial action wiring

**Files:** `src/ui/radial/actions.ts`, `src/ui/radial/RadialMenu.tsx` (extend).

Each action is a typed handler `(ctx: RadialContext) => Promise<void>`. Context includes the raycast hit, current inventory, equipped tool. Actions dispatch to `building/place.ts`, `building/mine.ts`, etc.

**Acceptance:** unit tests cover per-surface options; browser test confirms the menu fires the right action.

### T2: Block placement

**Files:** `src/building/place.ts`, `src/building/inventory.ts`.

`canPlace(slug, position)`: not solid, not occupied by player AABB, has supporting block beneath (for non-floor blocks). `place(slug, position)`: deduct 1 from inventory's matching item; mutate ChunkData; mark dirty (triggers PRQ-03 mesher + PRQ-06 navmesh regen).

**Acceptance:** node tests for `canPlace` cover supports/inventory; browser test places + removes a block end-to-end.

### T3: Block mining

**Files:** `src/building/mine.ts`.

`startMine(position, equippedTool)`: opens a progress UI (radial-menu-style ring) over the held block; on completion: remove block from ChunkData (set to air), spawn drops per `block.dropTable`, mark dirty.

**Acceptance:** node tests for timing math; browser test mines a desk → drops 4 planks.

### T4: Drop tables

**Files:** `public/content/dropTables.json`, `src/content/dropTables.ts`.

`{ "laminate-desk-block": [{ slug: "plank", qty: 4, prob: 1.0 }], ... }`. zod-validated.

**Acceptance:** loader test.

### T5: Staircase placement

**Files:** `src/building/stairs.ts`, `src/render/world/PlacedStructure.tsx`.

`placeStaircase(slug, position, rotation)`: spawns a koota entity bound to the GLB; `<PlacedStructure/>` renders it via drei `<Gltf/>` + Rapier `<RigidBody type="fixed">`. Persists via `placed_structures` repo. Removed via `Mine` radial action (returns 50% materials).

**Acceptance:** browser test places, walks up, and the player Y position increases.

### T6: Vertical shaft + falling damage

**Files:** `src/ecs/components/Falling.ts`, `src/combat/fallDamage.ts`.

Player kinematic controller already handles gravity (Rapier). Track `Falling.startY` when grounded becomes false; on regrounding, compute `dropHeight = startY - currentY`. Apply damage formula above.

**Acceptance:** node test for damage formula; browser test: place at Y=10, no support, drop → damage applied at landing.

### T7: Climbing-on-desk via radial

**Files:** `src/building/climb.ts`.

`Climb On` action: kinematic teleport to top of the desk (Y + desk.height), capped to a max climb step of 1.2u (single-step climb only).

**Acceptance:** browser test climbs onto a desk.

### T8: E2E build sequence

**Files:** `e2e/building.spec.ts` (`@golden`).

Boot → mine 1 desk (acquire 4 planks) → place 1 staircase → climb stair → mine ceiling block → drop through hole → fall damage applied → player still alive (drop ≤ 4 cubes from above gives ≤ 8 dmg).

**Acceptance:** green.

### T9: PR + merge

PR: `feat(building): radial-driven place/mine + staircases + shaft drops (PRQ-11)`. Squash-merge after `validate-deployed` green.

## Notes

`Place Sign` and `Reinforce` actions are alpha-stubbed (no-ops with toast "not yet"); both ship in PRQ-B0 / PRQ-B8.
