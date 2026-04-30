---
title: Screenplay Language
updated: 2026-04-30
status: current
domain: technical
---

# Screenplay Language

A **level is a screenplay**. The encounter director plays it like a film projector plays a reel — frame after frame, no agency, no branching. This doc is the cue-verb reference. Every cue in every level doc speaks this language.

## The cue shape

```ts
interface Cue {
  id: string;            // unique within the level — referenced by other cues for sequencing
  trigger: CueTrigger;
  action: CueAction;
  difficulty?: DifficultyGate;  // optional — cue is only emitted when active difficulty matches
}

type DifficultyGate =
  | 'easy+'         // E and harder
  | 'normal+'       // N and harder
  | 'hard+'         // H and harder
  | 'nightmare+'    // NM and harder
  | 'un-only';      // UN only
```

When `difficulty` is set, the director skips this cue at level-boot if the active difficulty is below the gate. Used for ad-rush beats that overwhelm Normal players but are correct on Hard+ (e.g., Stairway C Position 3 third ad-rush spawn).

## Triggers

A trigger answers "**when** does this cue fire?". There are three.

```ts
type CueTrigger =
  | { kind: 'wall-clock'; atMs: number }
  | { kind: 'on-arrive'; railNodeId: string }
  | { kind: 'on-clear'; railNodeId: string };
```

| Trigger | Fires when |
|---|---|
| `wall-clock` | The director's wall clock for this level reaches `atMs` (relative to level start, ignoring pause). Used for ambience swells, narrator beats, scripted mid-glide events. |
| `on-arrive` | The camera rail enters its dwell at the named node. Combat positions are always `on-arrive` cues. |
| `on-clear` | The director ceases all enemies attached to the named position AND the rail dwell timer is non-zero (early clear). Used for scoring stingers, accelerated transitions. |

There is **no** `on-kill`, `on-hit`, `on-miss`, or `on-civilian` trigger. Those events are routed through the score subsystem, not the cue queue. A cue cannot react to player skill — only to authored time and authored topology.

## Actions

An action answers "**what** does this cue do?". 14 verbs, exhaustive. Levels never invent verbs.

```ts
type CueAction =
  | { verb: 'camera-shake'; intensity: number; durationMs: number }
  | { verb: 'lighting'; lightId: string; tween: LightingTween }
  | { verb: 'ambience-fade'; layerId: string; toVolume: number; durationMs: number }
  | { verb: 'audio-stinger'; audio: string; volume?: number }
  | { verb: 'narrator'; text: string; durationMs: number }
  | { verb: 'door'; doorId: string; to: 'open' | 'closed' }
  | { verb: 'shutter'; shutterId: string; to: 'down' | 'up' | 'half' }
  | { verb: 'prop-anim'; propId: string; animId: string }
  | { verb: 'enemy-spawn'; railId: string; archetype: ArchetypeId; fireProgram: FirePatternId; ceaseAfterMs?: number }
  | { verb: 'civilian-spawn'; railId: string }
  | { verb: 'boss-spawn'; bossId: BossId; phase: number }
  | { verb: 'boss-phase'; bossId: BossId; phase: number }
  | { verb: 'level-event'; event: 'fire-alarm' | 'power-out' | 'lights-restored' | 'elevator-ding' }
  | { verb: 'transition'; toLevelId: LevelId };
```

### `camera-shake`

Director offsets the camera position by Perlin noise scaled to `intensity` for `durationMs`. Used for explosions, boss-charge impact, vault-drop landings.

```ts
{ verb: 'camera-shake', intensity: 0.15, durationMs: 400 }
```

### `lighting`

Changes a light primitive's parameters at runtime. The tween is a small DSL:

```ts
type LightingTween =
  | { kind: 'fade'; toIntensity: number; durationMs: number }
  | { kind: 'flicker'; minIntensity: number; maxIntensity: number; hz: number; durationMs: number }
  | { kind: 'snap'; intensity: number; color?: [number, number, number] }
  | { kind: 'colour-shift'; toColor: [number, number, number]; durationMs: number };
```

Light primitives are addressed by their `id` from the construction-primitives layer.

### `ambience-fade`

Tweens an ambience layer's volume (0..1) over `durationMs`. Used for mood transitions — `tense-drone` rises during HR Corridor, `radio-chatter` fades when the player enters the Boardroom.

### `audio-stinger`

One-shot non-looping audio. `audio` is the path under `public/assets/audio/`. Used for narrator interjections, quack-sax / klaxon comedy beats, mini-boss intro stings.

### `narrator`

A short overlay text bubble. The director queues a one-line caption (e.g., "EXECUTIVE FLOOR — 47") for `durationMs` over the HUD. Narrator cues are mid-glide-only — never during dwell.

### `door`

Animates a Door primitive between `closed` and `open`. The animation duration is fixed by the door's `swing` (rolling = 1.6s, swing = 0.6s, slide = 0.8s). If the door has a `spawnRailId`, the cue list typically queues an `enemy-spawn` on the same wall-clock tick.

### `shutter`

Same as `door` but for Shutter primitives.

### `prop-anim`

Plays a named animation on a Prop's GLB animation group. Animations are authored into the GLB itself (the boardroom chandelier has a `swing` animation; the executive elevator has `ding`).

### `enemy-spawn`

Instantiates an enemy prop at `railId.path[0]` and runs the named fire program on it.

```ts
{
  verb: 'enemy-spawn',
  railId: 'lobby-spawn-rail-side-door-A',
  archetype: 'security-guard',
  fireProgram: 'pistol-pop-aim',
  ceaseAfterMs: 4000,  // optional — director auto-ceases if alive
}
```

The fire program runs from spawn until either (a) the enemy is killed, (b) the director calls `cease()`, or (c) `ceaseAfterMs` elapses. The director also auto-ceases enemies still alive when the camera rail leaves their dwell.

Enemies cannot decide to stop firing, retreat, aim, or notice the player. The director is the brain.

### `civilian-spawn`

Same as enemy-spawn but for a CivilianRail. Civilians walk start-to-end and despawn at end. Always non-combat.

### `boss-spawn`

Instantiates a boss at the level's authored boss anchor. The phase is the starting phase (always 1).

### `boss-phase`

Transitions the named boss to a new phase. Bosses are the only entities with a phase machine, and even that is director-driven: the director watches boss HP thresholds and emits this cue when crossed.

### `level-event`

Macro cues with bespoke runtime hooks:

| Event | Effect |
|---|---|
| `fire-alarm` | Klaxon audio loops, all ceiling fluorescents flicker red at 4Hz, every door with a `spawnRailId` simultaneously animates open. (Lobby Position 1 set piece.) |
| `power-out` | All lights snap intensity 0; emergency-strip lights fade in over 800ms; ambience swaps to `tense-drone`. (Stairway C climax.) |
| `lights-restored` | Inverse of `power-out`. |
| `elevator-ding` | Stinger plays; an authored `props/elevator-doors-anim.glb` (or equivalent prop-anim on a Door primitive) opens. (Lobby exit; HR Corridor exit.) |

### `transition`

Ends the current level and starts the named next level. Camera fades to black over 400ms, the next level's screenplay starts at `t=0`.

## Cue-list authoring

A level's cue list is an ordered array. Order does NOT determine fire order — `trigger` does. The director sorts wall-clock cues by `atMs` and indexes `on-arrive`/`on-clear` cues by `railNodeId`. Authoring order is for human readability (group cues by combat position).

```ts
const lobbyCues: Cue[] = [
  // glide-in
  { id: 'amb-1', trigger: { kind: 'wall-clock', atMs: 0 }, action: { verb: 'ambience-fade', layerId: 'radio-chatter', toVolume: 0.6, durationMs: 1000 } },
  { id: 'narr-1', trigger: { kind: 'wall-clock', atMs: 200 }, action: { verb: 'narrator', text: 'LOBBY — FLOOR 1', durationMs: 1500 } },

  // position 1 — front desk
  { id: 'p1-spawn-a', trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'door', doorId: 'reception-side-a', to: 'open' } },
  { id: 'p1-spawn-b', trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'enemy-spawn', railId: 'reception-side-a-rail', archetype: 'security-guard', fireProgram: 'pistol-pop-aim' } },
  // ...
];
```

## What the director owns

The director has agency. Enemies do not. Specifically the director:

1. Ticks the wall clock and matches `wall-clock` cues.
2. Subscribes to camera-rail `arrive` / `clear` events and matches `on-arrive` / `on-clear` cues.
3. Ticks each active enemy's fire program (which emits authored fire events; the director processes them).
4. Processes player hits, deducts enemy HP, and calls `kill()` when HP reaches 0.
5. Emits `cease()` on enemies whose dwell is ending or whose `ceaseAfterMs` has elapsed.
6. Resolves boss HP-threshold crossings into `boss-phase` cues.
7. Pauses on player death, resumes on continue, restarts on game-over.
8. Processes the `transition` cue — disposes the current level scene and boots the next.

## What the director does NOT own

- **Player input** — the input handler reads tap / drag and emits `fire(x, y)` / `cover` / `weapon-swap` events directly to the game state.
- **Score** — score events are routed through a separate score subsystem, not the cue queue.
- **Reticle colour** — the reticle is a HUD element that consumes the active enemy list each frame; it has no cue verbs because it has no agency.
- **Player movement** — there is no movement; the camera rail moves the player.

## Authoring rules (hard)

1. **No invented verbs.** If a level needs an effect that doesn't fit the 14 verbs, file a doc-canon update *first* — extend this doc, lock the new verb, then use it.
2. **Every cue is referenced from a level doc.** Orphan cues are bugs.
3. **Wall-clock cues are absolute.** A late-firing wall-clock cue blocks the next combat position only if the position is on a `wall-clock` trigger; mostly cues run in parallel with player engagement.
4. **No `enemy-spawn` without a `door` / `shutter` / `prop-anim` cue at the same wall-clock tick** unless the spawn rail is genuinely off-stage and invisible.
5. **A boss cannot have more cues than 1 boss-spawn + N boss-phase + the cease at level-end.** All boss behaviour beyond phase machine lives in the boss's fire-program tape, not the cue list.
