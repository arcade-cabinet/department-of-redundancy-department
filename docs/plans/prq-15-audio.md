# PRQ-15: Audio

**Status:** queued

**Blocked by:** PRQ-14.

## Goal

Wire the GlobalAudio wrapper over `THREE.Audio` + listener; populate ambience, weapon SFX, intercom pages, threat-tier audio cues, footsteps, door creaks. Replace every `audio:*` event stub from earlier PRQs with a real audio source.

## Spec reference

§ 0 (audio cues per tier), § 11.3 (landing audio: distant intercom on first gesture + office hum loop), spec on no Howler / no bare THREE.Audio.

## Success criteria

- `src/audio/GlobalAudio.ts`: singleton master volume + shared `THREE.AudioListener`. Methods: `setMaster(v)`, `getListener(): THREE.AudioListener`.
- `src/audio/AudioManager.ts`: load/create/destroy `THREE.Audio` instances; LRU cache up to 32 buffers; positional vs non-positional split.
- `src/audio/AudioBackground.ts`: playlist looped with crossfade.
- All `audio:*` events from earlier PRQs subscribed and fire real sources.
- Threat-tier escalation triggers a layered ambience swap (managers-only → adds radio chatter at threat≥2 → adds boots-thump at threat≥5 → adds tense drone at threat≥8).
- Master volume slider (PauseMenu) modulates GlobalAudio in real time.
- iOS audio unlock: first user gesture on Landing primes `AudioContext` (Web Audio policy).
- Bundle size: total audio under `public/assets/audio/` ≤ 6 MB.

## Task breakdown

### T1: GlobalAudio + listener

**Files:** `src/audio/GlobalAudio.ts`, `src/audio/GlobalAudio.test.ts`.

Singleton holding a shared `THREE.AudioListener` mounted on the active R3F camera (effect bound to camera prop in `Game.tsx`).

**Acceptance:** node test for master volume math; browser smoke confirms listener attaches.

### T2: AudioManager

**Files:** `src/audio/AudioManager.ts`, `src/audio/loadBuffer.ts`.

`load(slug)`, `play(slug, opts)`, `stop(slug)`, `attachPositional(slug, group)`. Lazy-loads OGG/MP3 buffers from `/assets/audio/<slug>.<ext>` (prefer OGG for size). LRU eviction.

**Acceptance:** browser test loads a stub OGG and `play` returns active source.

### T3: AudioBackground

**Files:** `src/audio/AudioBackground.ts`.

Playlist API with 1.5s crossfade. Used for ambience layers.

**Acceptance:** browser test verifies crossfade ramp.

### T4: Audio asset pull

**Files:** `scripts/fetch-audio.mjs`. Pull from a curated CC0 set (Freesound or kenney.nl). Slugs: `office-hum`, `intercom-page-1..3`, `radio-chatter`, `boots-tile`, `tense-drone`, `stapler-fire`, `three-hole-punch-fire`, `coffee-pickup`, `binder-clip-pickup`, `footstep-carpet`, `footstep-tile`, `door-open`, `door-locked`, `floor-arrival`, `reaper-teleport`, `reaper-defeat`, `manager-spot`, `police-spot`, `hitman-pen-click`, `swat-thump`, `damage-flash`, `gameover-stamp`, `floor-key-collect`. ≤ 6 MB total.

**Acceptance:** `pnpm dlx node scripts/fetch-audio.mjs` populates `public/assets/audio/`.

### T5: Event subscriptions

**Files:** `src/audio/eventBindings.ts`.

Single subscription module that listens for all `audio:*` events from earlier PRQs and dispatches to AudioManager. Includes per-event positional toggle (e.g. weapon fire is positional from owner; HUD damage flash is non-positional).

**Acceptance:** node test verifies binding map covers every emitted event.

### T6: Layered ambience director

**Files:** `src/audio/ambience.ts`.

Watches `world_meta.threat`; on tier crossings, fades layers in/out via `AudioBackground`. Layer 0 always on; 1 fades in at threat≥2, etc.

**Acceptance:** node test simulates threat = 0 → 8; assert layers active at each step.

### T7: iOS audio unlock

**Files:** `src/audio/unlock.ts`.

First user pointerdown anywhere → `AudioContext.resume()` if suspended. Hook in `App.tsx`.

**Acceptance:** browser test simulates suspended → click → state running.

### T8: PauseMenu volume wire

**Files:** `app/views/PauseMenu.tsx` (extend).

Settings tab volume sliders write to `preferences.{volume_master,volume_sfx,volume_music}` and call `GlobalAudio.setMaster(v)` immediately.

**Acceptance:** browser test changes slider → master volume changes.

### T9: PR + merge

PR: `feat(audio): GlobalAudio + ambience layers + event bindings (PRQ-15)`. Squash-merge after `validate-deployed` green.

## Notes

If the curated CC0 set lacks a slug, generate it with a simple synth (FM operator) and commit. Mood beats fidelity at alpha.
