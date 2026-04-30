# PRQ-12: Stairwells + Floor Transitions

**Status:** queued

**Blocked by:** PRQ-11.

## Goal

Replace the door visual stubs from PRQ-03 with the locked stairwell behavior: tap door → creak open (300ms) → fade-cut (200ms) → spawn at opposite door of destination floor. Up-Door of floor N takes you to Down-Door of floor N+1. Single intercom-page audio cue on arrival. After this PRQ: a player can clear floor 1, enter Up-Door, arrive on floor 2, complete the loop.

## Spec reference

§ 4 Vertical traversal: stairwells (locked, replaces elevators), § 19 §19.2 (Up-Door + Down-Door working).

## Success criteria

- `<Door slug="up-door" | "down-door"/>` component renders the door GLB (or placeholder), tap-interactable.
- Tap fires `floor-transition(direction)`: door opens animation → black fade-cut → swap floor → camera positioned at opposite-direction door of destination floor.
- Floor data swap: previous floor's chunks evicted from memory; new floor generated from `(seed, floor+1 | floor-1)` if not in DB; if cached in DB, restored from `chunks` repo.
- `current_floor` persists; `last_floor` mirror in preferences for landing-resume.
- Threat decays by -0.5 on floor change.
- Spawn director re-runs on floor enter (PRQ-08 + PRQ-10).
- E2E golden path: clear floor 1, enter Up-Door, arrive on floor 2, save+reload restores at floor 2, descend back to floor 1, mined-desk and placed-stair from floor 1 still present.

## Task breakdown

### T1: Door component

**Files:** `src/render/stairwells/Door.tsx`. Replace PRQ-03 stub.

Renders door GLB; double-doors with hairline-stamped sign (`▲ UP` / `▼ DOWN`). On tap: animate doors opening (Framer Motion on rotation Y of two child meshes); after 300ms emit `floor-transition`.

**Acceptance:** browser test: tap door → door angle reaches 90° in 300ms.

### T2: Fade-cut transition

**Files:** `src/render/stairwells/Transition.tsx`.

Full-screen black `<motion.div>` animated 0→1 over 200ms; on top of canvas. After fade-in: invokes the floor-swap callback; after swap: fade-out 200ms.

**Acceptance:** browser test: trigger transition → screen black for ~200ms.

### T3: Floor swap

**Files:** `src/world/floor/swap.ts`, `src/world/floor/loadFloor.ts`.

`swap(direction: 'up'|'down')`:
1. Save current floor (flush all dirty chunks via PRQ-04 save loop, immediate flush).
2. Increment/decrement `current_floor`.
3. Try `chunks.list(floor)` from DB; if rows exist, restore. Else generate via `generateFloor(seed, floor)`.
4. Apply Threat decay (-0.5).
5. Re-spawn enemies via PRQ-10 spawn director.
6. Position player at the opposite door (Up-Door of N → enter at Down-Door of N+1).

**Acceptance:** browser test full round-trip: floor 1 → 2 → 1, mined-desk preserved.

### T4: Door interaction → transition wiring

**Files:** `src/input/PlayerController.tsx` (extend), `src/render/stairwells/Door.tsx` (event emit).

Tap on door surface kind → emit `door-tap(slug)`; controller invokes Door's open animation, then transition, then swap.

**Acceptance:** end-to-end via dev mode passes.

### T5: Intercom page audio cue stub

**Files:** `src/audio/cues.ts`.

Emits `audio:floor-arrival` event; full audio in PRQ-15.

**Acceptance:** event emitted on floor arrival.

### T6: Last-floor resume from landing

**Files:** `app/views/Landing.tsx` (extend).

If `preferences.last_floor > 1` exists, the `CLOCK IN` button text becomes `RESUME ON FLOOR {N}` and routing skips into the saved floor.

**Acceptance:** browser test: set last_floor=2, reload landing → button shows "RESUME ON FLOOR 2"; click → game starts on floor 2.

### T7: E2E full transit

**Files:** `e2e/floor-transition.spec.ts` (`@golden`).

Boot → kill 1 manager → mine 1 desk → place 1 staircase → enter Up-Door → assert on floor 2 → enter Down-Door → assert on floor 1 → assert mined desk still mined and staircase still placed.

**Acceptance:** green.

### T8: PR + merge

PR: `feat(stairwells): Up/Down doors + fade-cut transitions + floor swap (PRQ-12)`. Squash-merge after `validate-deployed` green.

## Notes

When the destination floor is uncached in the DB, generation can take ~50ms — the fade-cut hides this. If generation is slow on mobile, extend the fade-cut window to cover it (250ms in/out instead of 200).
