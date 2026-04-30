# PRQ-06: Yuka Navmesh + Player Path-Follow

**Status:** queued

**Blocked by:** PRQ-05.

## Goal

Build the Yuka NavMesh from chunk floor tops, regen on chunk dirty (worker-thread, debounced 100ms), and route the player's tap-to-travel through `yuka.NavMesh.findPath` + `FollowPathBehavior` on a kinematic player Vehicle wrapper. After this PRQ: tap-to-travel handles obstacles correctly (no more straight-line clipping).

## Spec reference

§ 7 AI / Yuka pathfinding (locked) — player tap-to-travel section.

## Success criteria

- `src/ai/navmesh/builder.ts` walks chunk top faces of solid `walkableTop` blocks → emits a planar triangulated `yuka.NavMesh`.
- Worker thread (`src/ai/navmesh/worker.ts`) handles regen async with the latest snapshot of dirty chunks; debounced 100ms.
- `<NavMeshViz/>` debug overlay renders nav polygons (toggle via `?debug=navmesh`).
- Player kinematic controller follows a `yuka.Path` returned by `findPath(from, to)`. Re-tap = abort + new path. WASD = abort + direct.
- Pathing handles cubicle walls + closed doors + supply-closet trespass (treated as un-walkable until permitted).
- Performance: navmesh build for one floor (16×16 cells = 16 chunks) < 50ms on desktop CI runner. A* `findPath` < 5ms median.
- Browser test asserts a Z-shape path through cubicle walls reaches the goal.

## Task breakdown

### T1: NavMesh builder

**Files:** `src/ai/navmesh/builder.ts`.

Input: `ChunkData[]` for current floor. For each (x,z) cell, find the highest solid block whose `walkableTop === true`; emit a quad at (x, y+1, z) → 1×1 unit. Coalesce coplanar quads into larger polygons. Return a `yuka.NavMesh` via `NavMesh.fromPolygons(polys)`.

**Acceptance:** node test: a 4×4 floor with one wall column produces a navmesh with the wall cell missing.

### T2: Worker thread + debounce

**Files:** `src/ai/navmesh/worker.ts`, `src/ai/navmesh/NavMeshHost.ts`.

Worker receives `{ chunks: ArrayBuffer[] }`, returns `{ polygons }`. Host on the main thread debounces 100ms; while regen pending, exposes the cached navmesh.

**Acceptance:** dirtying 5 chunks in 50ms triggers exactly one rebuild.

### T3: NavMeshViz debug overlay

**Files:** `src/verify/NavMeshViz.tsx`.

Renders triangle wireframe of the current navmesh, slightly above ground (Y + 0.02), color = `--toner-cyan`. Mounted under `?debug=navmesh`.

**Acceptance:** dev mode shows the mesh outlining hallways.

### T4: Player Vehicle wrapper

**Files:** `src/ai/core/PlayerVehicle.ts`.

Wraps the kinematic player in a `yuka.Vehicle` for path-following only (no other steering — player is direct-driven). `FollowPathBehavior` consumes a `yuka.Path` from `navMesh.findPath`.

**Acceptance:** node test: vehicle with a 3-segment path arrives at goal in expected ticks.

### T5: Tap-to-travel uses navmesh

**Files:** `src/input/PlayerController.tsx` (replace straight-line path from PRQ-05 T3).

On `tap-travel(worldPos)` → `path = navMesh.findPath(player.pos, worldPos)`; vehicle follows. On new tap → vehicle.path = newPath. On WASD → vehicle.path = null + direct velocity.

**Acceptance:** tapping across a cubicle wall produces a path *around* it (visible via NavMeshViz path overlay).

### T6: PathViz debug overlay

**Files:** `src/verify/PathViz.tsx`.

Renders the active player path as a line strip + per-waypoint dot. Toggle `?debug=path`.

**Acceptance:** path renders; updates on new tap.

### T7: Edge cases

**Files:** Unit tests in `src/ai/navmesh/builder.test.ts`, integration in `e2e/path-follow.spec.ts` (`@golden`).

- Tap on un-walkable surface (wall, ceiling) → no path; fall back to radial (PRQ-05).
- Tap inside supply closet (currently un-walkable per generator) → no path; UI shows "ACCESS DENIED" toast.
- Re-tap mid-path → recompute, no jitter.

**Acceptance:** all green.

### T8: PR + merge

PR: `feat(ai): yuka navmesh build + player path-follow controller (PRQ-06)`. Squash-merge after `validate-deployed` green.

## Notes

The same navmesh is consumed by enemy AI starting in PRQ-08. No code change needed there — they read from `NavMeshHost.current` like the player does.
