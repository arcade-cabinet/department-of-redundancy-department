# PRQ-05: Input

**Status:** queued

**Blocked by:** PRQ-04.

## Goal

Implement the locked input model: tap-to-travel, drag-look, tap-and-hold radial menu, with desktop fallback (WASD path-override + ESC-pause + right-click focus-fire + mouse-drag-look). No virtual joysticks. Same input set on phone and desktop.

## Spec reference

§ 5 Input model (locked, mobile-first), § 19 §19.2 (gameplay bar — radial + tap-to-travel).

## Success criteria

- `<InputCanvas/>` mounts a transparent overlay capturing touch/pointer events on top of the R3F canvas.
- Input actions emitted to a koota event bus: `tap-travel(worldPos)`, `tap-engage(entityId)`, `tap-interact(entityId)`, `drag-look(dx,dy)`, `hold-radial(worldPos, surfaceKind)`.
- Hold threshold 220ms with ≤8px movement tolerance; otherwise drag-look.
- Pointer-lock on desktop click, touch-drag elsewhere.
- Radial action menu rendered via Radix Popover + Framer Motion arc-spread animation; context-aware option set per surface kind.
- WASD overrides current path-target (cancel pathfinding, direct kinematic move). ESC pauses. Right-click toggles focus-fire on hovered enemy.
- No nipplejs / no virtual joystick visible anywhere.
- Vitest browser covers gesture classifier (drag vs tap vs hold).
- Manual mobile test on Chrome DevTools touch emulation passes.

## Task breakdown

### T1: Gesture classifier

**Files:** `src/input/gesture.ts`, `src/input/gesture.test.ts`.

State machine over pointer events: `down → drag if move >8px before 220ms → up → tap` ; `down → hold-fired at 220ms if no move`. Emits classified events.

**Acceptance:** node tests cover all branches.

### T2: `<InputCanvas/>` overlay

**Files:** `src/input/InputCanvas.tsx`, `app/views/Game.tsx` (mount it).

Transparent `<div>` over the R3F `<Canvas/>`. Captures pointer events; classifies; raycasts world hits via the R3F event system or a stored ref to `gl.scene` + `camera` + a `Raycaster` (BVH-accelerated). Emits to koota's event bus.

**Acceptance:** clicking on the floor logs `tap-travel: world(x,y,z)`.

### T3: Player kinematic controller

**Files:** `src/input/PlayerController.tsx`, `src/ecs/components/Player.ts`.

Rapier `KinematicCharacterController`. Eye height 1.6u. Receives `tap-travel(worldPos)` → starts following a path (PRQ-06 builds the actual navmesh; for PRQ-05 the path is just a straight line). WASD overrides: cancel current path, apply velocity directly.

**Acceptance:** `pnpm dev`, click floor, camera moves to that point along ground; WASD overrides immediately.

### T4: Drag-look + pointer-lock

**Files:** `src/input/lookControls.ts`, integrate into `<InputCanvas/>`.

On desktop: `requestPointerLock()` on first canvas click; `mousemove` deltas → camera yaw/pitch with sensitivity from `preferences.look_sensitivity`. On touch: drag deltas direct.

**Acceptance:** dragging changes camera yaw/pitch; ESC cancels pointer-lock; settings change reflects in next gesture.

### T5: Radial action menu UI

**Files:** `src/ui/radial/RadialMenu.tsx`, `src/ui/radial/options.ts`.

Radix `Popover` anchored at hold-fired screen position. Options arranged on a 5-slice arc with Framer Motion spring entry. Each option: `{ id, label, icon, action }`. `options.ts` exports `optionsFor(surfaceKind: 'floor'|'wall-world'|'wall-placed'|'desk'|'terminal'|'printer'|'door'|'enemy')` returning the option list.

**Acceptance:** browser test: hold-fire on a `floor` raycast hit shows 5 options; clicking one fires the named action and dismisses.

### T6: Surface classifier

**Files:** `src/input/surfaceKind.ts`.

Given a BVH raycast hit, derive the `surfaceKind`. Reads block ID at hit position from the chunk; for non-block entities (enemies, terminals, printers, doors), reads a tag set in their koota component.

**Acceptance:** node test covers each surface kind.

### T7: Desktop fallback wiring

**Files:** `src/input/desktopFallback.ts`.

Keyboard listeners: `KeyW/A/S/D` → set/clear directional override flag on Player; `Escape` → emit `pause`. Right-click on enemy raycast → emit `tap-engage` toggle.

**Acceptance:** desktop manual test passes; mobile path unaffected.

### T8: Pause UI stub

**Files:** `app/views/PauseMenu.tsx` (placeholder; full polish in PRQ-14).

Radix Dialog with Resume / Settings (volume + sensitivity sliders) / Quit-to-Landing. Pauses the koota tick.

**Acceptance:** ESC opens it; sliders write to preferences; resume continues.

### T9: PR + merge

PR: `feat(input): tap-to-travel + drag-look + tap-and-hold radial + desktop fallback (PRQ-05)`. Squash-merge after `validate-deployed` green.

## Notes

This PRQ deliberately does not depend on PRQ-06 (navmesh). The path used in T3 is a straight line; PRQ-06 swaps it for a `FollowPathBehavior`-driven navmesh path without changing the input contract.
