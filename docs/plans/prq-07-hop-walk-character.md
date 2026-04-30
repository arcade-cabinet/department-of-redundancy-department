# PRQ-07: Hop-Walk Locomotion + `<Character/>` Mount

**Status:** queued

**Blocked by:** PRQ-06.

## Goal

Implement the uniform hop-walk locomotion shader/transform layer (spec §3.5) and finalize `<Character slug={...}/>` as the canonical mount for any GLB character. Idle / walk / run / attack / hit / death state-driven via per-frame transform sets — no skeletal animations.

## Spec reference

§ 3.5 No animations — uniform hop-walk, § 3.4 Roster table (slug map).

## Success criteria

- `<Character slug=… state=… speed=…/>` renders the GLB with hop-walk layered on top of the model's transform.
- State machine: `idle | walk | run | attack | hit | death` with the exact transform formulas from spec §3.5.
- Hop curve: `Y = abs(sin(speed × t × π))² × hopHeight`; `hopHeight = 0.12u` walk, `0.22u` run.
- RotZ rock = `sin(t × π × speed) × 0.05`; rotX lean = `clamp(speed × 0.08, 0, 0.12)`.
- Landing squash at hop low point: `scale.y *= 0.92` for 60ms.
- Idle: zero hop, ±0.01u Y-breathe at 0.3 Hz.
- Attack: lunge forward 0.4u over 120ms ease-out, return.
- Hit: 80ms ±0.05u XYZ shake + emissive red flash via material override.
- Death: rotZ 90° over 0.6s + 0.5s dissolve fade.
- Browser test asserts hop Y is non-zero while walking; zero while idle.
- `<Character/>` works for every roster slug (visual smoke test for each).

## Task breakdown

### T1: Locomotion state machine

**Files:** `src/render/characters/locomotion.ts`, `src/render/characters/locomotion.test.ts`.

Pure functions: `hopY(t, speed)`, `rotZRock(t, speed)`, `rotXLean(speed)`, `idleBreathe(t)`. State enum + transitions; `hit` and `death` carry timers.

**Acceptance:** node tests cover each function at boundary inputs (`t=0`, `speed=0`, after-timeout).

### T2: Material override system (hit-flash + dissolve)

**Files:** `src/render/characters/materialOverrides.ts`.

Patches a `MeshStandardMaterial`'s `onBeforeCompile` to inject a `uHitFlash: float` and `uDissolve: float` uniform. Hit-flash mixes vertex color → `--auditor-red` over 80ms. Dissolve adds a noise-thresholded discard. Reused for every Character regardless of slug.

**Acceptance:** browser test: setting `uHitFlash=1` makes the model render red; `uDissolve=1` discards everything.

### T3: `<Character/>` component

**Files:** `src/render/characters/Character.tsx`. Replace the PRQ-02 stub.

Props: `{ slug, state, speed, position, rotation, onDeathEnd?: () => void }`. Internally:
- `useGLTF(manifest[slug].path)` → clone scene; patch all `MeshStandardMaterial` via `materialOverrides`.
- `useFrame((s, dt) => ...)`: read locomotion FSM; apply `position.y += hopY(...)`; apply rotZ/rotX; apply scale-squash if at low point; tick attack/hit/death timers; mutate uniforms accordingly.
- On state=`death` end → call `onDeathEnd()`.

**Acceptance:** browser test: mount `<Character slug="middle-manager" state="walk" speed={1.0}/>`, advance 500ms, assert `position.y > 0` at some frame and `< 0.001` at others (proves hop curve).

### T4: Per-tier visual differentiation

**Files:** `src/render/characters/tierStyles.ts`.

Lookup by slug → `{ scale, audioCueOnSpawn, walkSpeed }`. Manager 1.0×, police 1.1×, hitman 1.4×, swat 1.0×, hr-reaper 0.8× scaled 1.5. Audio cues stubbed (real wiring in PRQ-15).

**Acceptance:** node test asserts each roster slug has an entry.

### T5: Visual smoke for every roster slug

**Files:** `e2e/character-roster.spec.ts` (`@golden`).

Loads a `?scene=character-grid` route that mounts every roster slug walking in place; takes a screenshot; asserts <2% diff vs baseline `e2e/__snapshots__/character-roster.png`.

**Acceptance:** baselined; future regressions caught.

### T6: PR + merge

PR: `feat(render): hop-walk locomotion + Character component (PRQ-07)`. Squash-merge after `validate-deployed` green.

## Notes

Material overrides on cloned GLBs is the trickiest bit — drei's `useGLTF` returns shared scene by default. Ensure `clone()` is followed by per-mesh material clone so overrides don't leak between Character instances.
