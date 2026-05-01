---
title: Level 01 — The Lobby
updated: 2026-04-30
status: current
domain: product
---

# Level 01 — The Lobby

> The auditor enters through the front doors. The receptionist is gone, but her radio is still on. Security guards round the corner of the marble lobby with sidearms drawn. By the time the elevator dings open, the player has had their first kill, learned the cover button, and watched an intern walk through the line of fire.

## Theme

Marble floors, glass-brick exterior walls, polished brass trim, leather couches, fern in a brass pot. A reception desk dominates the foreground. Above it, a pendulum-style office clock ticks (audible). A revolving door at the rail's start; an elevator at the rail's end (visible from the start, beckons the player forward). Painted on the wall in stencil: "DEPARTMENT OF REDUNDANCY DEPARTMENT — FLOOR DIRECTORY 1-47."

This is the tutorial level — it teaches the verbs through deliberate authoring. Pacing is gentler than every subsequent level. First-time players should make it through Lobby on a first try; veterans clear it in ~50 seconds.

## Time budget

**Target: 75 seconds Normal**, comprising:

| Element | Seconds |
|---|---|
| Rail entrance (revolving door, ambience swell) | 3 |
| Combat Position 1 — front desk | 18 |
| Glide to position 2 (~5 units of rail) | 4 |
| Combat Position 2 — concourse | 22 |
| Glide to position 3 (~6 units) | 4 |
| Combat Position 3 — Security Chief Garrison (mini-boss) | 22 |
| Exit glide to elevator + ding + door open | 2 |
| **Total** | **75s** |

## Rail topology

```mermaid
graph LR
    Start([🚪 Revolving<br/>Door<br/>SPAWN])
    P1[🎯 Pos 1<br/>Front Desk<br/>15s]
    P2[🎯 Pos 2<br/>Concourse<br/>22s]
    P3[💀 Pos 3<br/>Security Chief<br/>Garrison<br/>22s]
    End([🛗 Elevator<br/>EXIT])

    Start -- "3s" --> P1
    P1 -- "4s glide" --> P2
    P2 -- "4s glide" --> P3
    P3 -- "2s ding" --> End

    style Start fill:#1a3050,stroke:#fff
    style End fill:#1a5030,stroke:#fff
    style P3 fill:#502020,stroke:#f00
```

Rail length: ~22 world units (cell size 4u × 5.5 cells of forward travel). Camera height: 1.6u. Camera FOV: 70°.

## Combat Position 1 — Front Desk

### Setup

The rail stops directly in front of the reception desk. Desk is to the player's left; a wide-open lobby extends to the right. Behind the desk, a closed wood door (Office of First Impressions). On the opposite wall, two cubicle doors (locked, not used in this position). Reception sign reads: "PLEASE HAVE YOUR EMPLOYEE ID READY."

Tutorial overlays (only on first-ever run, never replayed):
- **0:00** "DRAG TO AIM" — appears as the cursor moves
- **0:02** "TAP TO FIRE" — appears when an enemy enters orange-reticle state
- **0:08** "HOLD COVER BUTTON TO HIDE" — appears when the second enemy fires

### Encounter flow

```mermaid
sequenceDiagram
    autonumber
    participant Rail
    participant Door1 as Reception Door
    participant Door2 as Side Door
    participant Player

    Note over Rail: Rail stops at Position 1 (camera dips to cover)
    Rail->>Player: Tutorial overlay: "DRAG TO AIM"

    Note over Door1: t=2s — Wind-up: door creaks
    Door1->>Player: door-burst<br/>Manager (sidearm)<br/>Reticle: GREEN→ORANGE→RED
    Note over Player: Tutorial overlay: "TAP TO FIRE"
    Player-->>Door1: Headshot (kill)

    Note over Rail: t=8s — second beat
    Door2->>Player: cover-pop<br/>Manager (sidearm)<br/>Reticle wind-up
    Note over Player: Tutorial overlay: "HOLD COVER BUTTON"
    Player-->>Door2: Cover or kill

    Note over Rail: t=14s — calm beat
    Rail->>Player: background-shamble<br/>Manager (slow walker, far depth)
    Player-->>Rail: Long-range headshot (skill bonus)

    Note over Rail: t=18s — Position cleared
    Note over Rail: Rail resumes
```

### Beat list (Normal)

| t | Beat | Enemy | Notes |
|---|---|---|---|
| 2.0s | door-burst | manager | Reception door; tutorial frame |
| 8.0s | cover-pop | manager | Side cubicle wall; tutorial cover |
| 14.0s | background-shamble | manager | Far-depth corridor; reward early shot |

Three enemies. All managers (lowest tier). No civilians in this position.

### Memory budget

Loaded for Position 1: hands GLB, staple-rifle GLB, manager GLB (instanced 3×), 3 door textures, marble floor texture, glass-brick wall texture, reception desk GLB, ambience layer (managers-only). ~22 MB VRAM.

## Combat Position 2 — Concourse

### Setup

Wide concourse, leather couches in foreground, double-height ceiling with brass chandeliers. Two side corridors visible (NORTH WING / SOUTH WING signs). Behind the player, a directory sign listing all 47 floors (foreshadowing). On a wall to the right, a brass-framed painting of a smiling executive (this is the boss; the painting is foreshadowing). A single fern in a brass pot near the rail.

The concourse is wider than position 1, which gives the second beat-set more space to fan out enemies — vault-drops appear here for the first time.

### Encounter flow

```mermaid
sequenceDiagram
    autonumber
    participant Rail
    participant North as North Wing
    participant South as South Wing
    participant Couch
    participant Civilian as Office Worker
    participant Player

    Note over Rail: Rail stops at Position 2 (cover at couch)

    Note over North: t=2s — first beat
    North->>Player: door-burst<br/>Manager
    Player-->>North: Kill

    Note over South: t=5s — second beat
    South->>Player: cover-pop<br/>Manager
    Player-->>South: Kill

    Note over Civilian: t=10s — INTERN walks in from north
    Civilian->>Civilian: Walks across rail<br/>(NO TELEGRAPH)
    Note over Player: DO NOT SHOOT
    Player-->>Civilian: Holds fire

    Note over Couch: t=14s — first vault-drop
    Couch->>Player: vault-drop<br/>Manager from behind couch
    Note over Player: Headshot in mid-air = bonus
    Player-->>Couch: Mid-air headshot

    Note over Rail: t=22s — Position cleared
```

### Beat list (Normal)

| t | Beat | Enemy / Type | Notes |
|---|---|---|---|
| 2.0s | door-burst | manager | North Wing |
| 5.0s | cover-pop | manager | South Wing |
| 10.0s | civilian | intern | Walks N→S; do NOT shoot |
| 14.0s | vault-drop | manager | From behind leather couch |

Four beats; one is a civilian (don't shoot). Effective combat: 3 enemies.

### Memory budget

Adds: leather-couch GLB, fern GLB, painting GLB, 1 civilian (intern) GLB, filing-cabinet (mineable). ~8 MB on top of position 1 = ~30 MB cumulative.

## Combat Position 3 — Mini-Boss: Security Chief Garrison

### Setup

The rail stops at the elevator bank. Three elevators face the player; the center elevator's doors are closed. Side walls have brass mailbox slots (background dressing). On the wall above the elevators, a marquee sign reads: "EMPLOYEE OF THE MONTH — 2026 — JANICE WIDENMORE." (Janice never appears; this is flavor.)

The center elevator dings. Doors open. Out walks **Security Chief Garrison** — a heavyset uniformed security guard with a holstered revolver and a clipboard. He drops the clipboard. The fight begins.

### Garrison's spec

A security-chief reskin of the office security guard archetype: same GLB, swapped material to navy-blue uniform with brass buttons, badge on chest, peaked cap. Clipboard prop in left hand initially; he drops it as a visual cue at fight start.

| Difficulty | HP | Phase 1 attack | Phase 2 attack |
|---|---|---|---|
| Easy | 80 | Single shot every 2.5s | Single shot every 2.0s |
| Normal | 120 | Single shot every 2.0s | Three-round burst every 3.0s |
| Hard | 160 | Three-round burst every 2.5s | Five-round burst every 3.0s + cover-pop |
| Nightmare | 200 | Five-round burst every 2.0s + cover-pop | Five-round burst every 1.8s + 1 ad spawn |
| Ultra Nightmare | 250 | Five-round burst every 1.8s + cover-pop | Spray + 2 ad spawns + grenade lob |

Phase 1: Garrison stands at the elevator entrance, fires from cover, retreats behind elevator door, repeats. Player must time peeks.

Phase 2 (HP threshold 50%): Garrison emerges fully, advances to center of position, fires more aggressively. On Hard+, ads spawn from side corridors.

Weakpoint: head (250 score) or peaked cap (350 score — knocks the cap off, comedic). Justice-shot disarms the revolver; rare flex.

### Encounter flow

```mermaid
sequenceDiagram
    autonumber
    participant Rail
    participant Garrison
    participant Player

    Note over Rail: Rail stops at elevator bank
    Note over Garrison: t=2s — Center elevator dings
    Garrison->>Player: 🎯 ENTERS<br/>Drops clipboard (audio cue)<br/>Title card: "SECURITY CHIEF GARRISON"
    Note over Garrison: PHASE 1 begins<br/>HP 100%

    loop Phase 1 — duck and shoot
        Garrison->>Player: Cover-pop fire<br/>(2.0s interval)
        Player-->>Garrison: Body shots / headshots<br/>during peek
    end

    Note over Garrison: HP 50% threshold reached
    Garrison->>Garrison: 2s invuln flash<br/>"PHASE 2"
    Note over Garrison: PHASE 2 begins

    loop Phase 2 — advance + ads (Hard+)
        Garrison->>Player: Three-round burst<br/>(3.0s interval)
        Note over Rail: Hard+: ad spawns from side
        Player-->>Garrison: Sustained fire
    end

    Garrison->>Garrison: Death animation (3s)<br/>"GARRISON DOWN" stinger
    Garrison->>Player: Drops Garrison Key (cosmetic, score bonus)

    Note over Rail: Elevator behind Garrison opens<br/>Rail resumes
```

### Beat list

Phase 1 (12-15s):
- Garrison cover-pop volley (~3-4 cycles)
- Optional: tutorial overlay "USE COVER" if player hasn't yet

Phase 2 (15-18s):
- Garrison advance + faster fire
- Hard+: 1-2 manager ad spawns from side corridors (door-burst beat)

Total mini-boss time: 22-30s depending on player skill.

### Memory budget

Adds: Garrison material override (no new GLB), elevator GLB, mailbox-wall texture. ~5 MB on top of position 2 = ~35 MB cumulative.

## Set pieces

The Lobby has two memorable set pieces:

1. **The intern walk-through (Position 2, t=10s).** First civilian. Crosses the rail with no telegraph. Tutorial-essential — players who shoot the intern see the "YOU SHOT THE INTERN" sting, lose 25 HP, lose 500 score. Most first-time players DO shoot the intern; that's by design. The Lobby is forgiving enough to recover.

2. **The clipboard drop (Position 3 entry).** Garrison's clipboard hits the floor with an audible *thwack* as the fight starts. It's not interactive but it's a clean intro signal — "the boss is now active."

## Civilians

| Position | Civilian | Archetype |
|---|---|---|
| 1 | none | — |
| 2 | intern | walks N→S |
| 3 | none (boss fight) | — |

## Audio

- **Ambience layer**: low-key murmur + jazz (`ambience-managers-only.ogg` looping)
- **Position 1 entry**: revolving-door whoosh + ambient lobby chatter (synth)
- **Garrison enter**: elevator ding (`pl_button_click_soft_01.ogg` placeholder until proper)
- **Garrison death**: brief brass fanfare from victory stinger pool
- **Civilian shot**: scream from inventory pack + audio sting

## Theme assets (per the parent design's asset reuse table)

| Asset | Source |
|---|---|
| Marble floor | New: 1 PNG, ~512×512 tiling |
| Glass-brick wall | Existing: `T_Window_GlassBricks_00.png` (already curated) |
| Reception desk GLB | New: simple low-poly, ~5K verts |
| Pendulum clock | New: simple prop |
| Leather couch | New: simple prop |
| Fern | New: simple prop |
| Brass-framed painting | New: simple plane with painting texture |
| Elevator GLB | New: simple double-door with sliding animation |
| Filing cabinet | Existing: `cabinet-1.glb` from `public/assets/models/props/` |
| Manager enemy | Existing: `middle-manager.glb` |
| Security Chief reskin | Existing `security-guard.glb` + new material LUT |
| Civilian (intern) | New: 1 GLB with material variants for archetype |

## Authoring notes for implementation

- Position 1's tutorial overlays must NEVER replay after a first clear. Track via `firstLobbyClear: boolean` in `@capacitor/preferences`.
- Garrison's clipboard drop is timed to the elevator-ding audio cue — keep them synced if either timing is tweaked.
- The intern's walk speed is **0.7 m/s** (visibly slower than enemies) so players have time to recognize "this is a civilian." DO NOT speed the civilian up at higher difficulties — civilians are the mercy beat, the difficulty layer is the trap of denser placement, not faster movement.
- Garrison's "EMPLOYEE OF THE MONTH" wall sign should be visible from Position 1 (foreshadowing). The actual painting in Position 2 is a different employee (Janice); the boss is unannounced.

## Construction primitives

Coordinate frame: rail enters along +Z at `(0, 1.6, 0)`. Cell size 4m. Ceiling height 6m (atrium-tall). Numbers below are anchor positions per `04-construction-primitives.md` conventions.

### Floors & ceiling

| id | kind | origin | size | PBR / texture |
|---|---|---|---|---|
| `floor-marble` | floor | (0, 0, 12) | 12 × 24 | `laminate` (high-saturation marble tint) |
| `ceiling-atrium` | ceiling | (0, 6, 12) | 12 × 24 | `ceiling-tile` + 6 emissive cutouts (cool-white, intensity 0.7), one chandelier override at (0, 6, 16) |

### Walls

| id | kind | origin | size | overlay |
|---|---|---|---|---|
| `wall-east-1` | wall | (6, 0, 4) | 8 × 6 | drywall + `T_Window_GlassBricks_00.png` overlay (lobby exterior glass) |
| `wall-east-2` | wall | (6, 0, 12) | 8 × 6 | drywall + `T_Window_GlassBricks_01.png` overlay |
| `wall-west-1` | wall | (-6, 0, 4) | 8 × 6 | drywall + `T_Window_Wood_012.png` overlay (DEPARTMENT OF REDUNDANCY DEPARTMENT — FLOOR DIRECTORY) |
| `wall-west-2` | wall | (-6, 0, 12) | 8 × 6 | drywall + `T_Window_Wood_018.png` overlay (Janice painting) |
| `wall-end` | wall | (0, 0, 24) | 12 × 6 | drywall + `T_Window_Wood_026.png` overlay (EMPLOYEE OF THE MONTH marquee) |

### Doors

| id | kind | origin | size | texture | family | spawnRailId |
|---|---|---|---|---|---|---|
| `door-revolving` | door | (0, 0, 0) | 2 × 2.4 | `T_Door_Wood_028.png` | wood | `rail-spawn-revolving` (intro only — not for combat) |
| `door-reception-side-A` | door | (-3, 0, 4) | 1 × 2.2 | `T_Door_Wood_005.png` | wood | `rail-spawn-reception-A` |
| `door-side-cubicle-1` | door | (3, 0, 6) | 1 × 2.2 | `T_Door_PaintedWood_011.png` | painted-wood | `rail-spawn-side-1` |
| `door-north-wing` | door | (-6, 0, 12) | 1 × 2.2 | `T_Door_Wood_012.png` | wood | `rail-spawn-north-wing` |
| `door-south-wing` | door | (6, 0, 12) | 1 × 2.2 | `T_Door_PaintedWood_007.png` | painted-wood | `rail-spawn-south-wing` |
| `door-elevator-A` | door | (-2, 0, 24) | 1 × 2.4 | `T_Door_LiftDoor_00.png` | lift | (none — exit only) |
| `door-elevator-B` | door | (0, 0, 24) | 1 × 2.4 | `T_Door_LiftDoor_00.png` | lift | `rail-spawn-elevator-garrison` |
| `door-elevator-C` | door | (2, 0, 24) | 1 × 2.4 | `T_Door_LiftDoor_00.png` | lift | (none — exit only) |

### Pillars & props

| id | kind | origin | spec |
|---|---|---|---|
| `pillar-N-1` | pillar | (-3, 0, 16) | round, 0.6 diameter, 6m, drywall |
| `pillar-N-2` | pillar | (3, 0, 16) | round, 0.6 diameter, 6m, drywall |
| `prop-reception-desk` | prop | (-2, 0, 4) | `props/desk.glb`, scale 1.2 |
| `prop-couch` | prop | (4, 0, 12) | `traps/trap-3.glb` (leather couch substitute) |
| `prop-fern` | prop | (-4, 0, 8) | `traps/trap-7.glb` (fern substitute) |
| `prop-pendulum-clock` | prop | (-5, 0, 16) | `traps/trap-12.glb` (pendulum-clock substitute) |
| `prop-mailbox-wall` | prop | (0, 1.5, 23.8) | `traps/trap-22.glb` (mailbox cluster) |
| `prop-clipboard` | prop | (0, 0, 23.5) | `traps/trap-19.glb` (clipboard, animated drop on Garrison spawn) |

### Lights

| id | kind | spec |
|---|---|---|
| `light-fluorescent-fill` | hemispheric | (0, 6, 12), color (1.0, 1.0, 0.95), intensity 0.4 |
| `light-revolving-door-spot` | spot | (0, 4, 1), pointing -Z, color (0.95, 0.95, 1.0), intensity 1.2, conical 1.0 rad |
| `light-elevator-spot-B` | spot | (0, 4, 23.5), pointing +Z, color (1.0, 0.95, 0.85), intensity 1.5, conical 0.6 rad — Garrison reveal |

## Spawn rails

Spawn rails are addressed by id from the cue list. All rails start off-stage (behind walls or above the camera frustum).

| id | path (waypoints) | speed | loop |
|---|---|---|---|
| `rail-spawn-reception-A` | (-3.0, 0, 5.0) → (-3.0, 0, 4.0) → (-2.0, 0, 4.0) | 2.5 m/s | false |
| `rail-spawn-side-1` | (3.0, 0, 5.5) → (3.0, 0, 6.5) → (2.0, 0, 6.5) | 3.0 m/s | false |
| `rail-spawn-north-wing` | (-7.0, 0, 12.0) → (-6.0, 0, 12.0) → (-4.0, 0, 12.0) | 2.5 m/s | false |
| `rail-spawn-south-wing` | (7.0, 0, 12.0) → (6.0, 0, 12.0) → (4.0, 0, 12.0) | 2.5 m/s | false |
| `rail-spawn-vault-couch` | (4.0, 2.6, 13.0) → (4.0, 0, 13.0) → (4.0, 0, 12.0) | 5.0 m/s (fast vault) | false |
| `rail-spawn-elevator-garrison` | (0, 0, 25.0) → (0, 0, 24.0) → (0, 0, 22.0) | 2.0 m/s | false |
| `rail-civ-intern` | (-7.0, 0, 12.5) → (7.0, 0, 12.5) | 0.7 m/s | false |

## Camera-rail nodes

Per `05-screenplay-language.md`, the camera rail is its own RailGraph. Combat positions are `combat`-kind nodes; intermediate path is `glide`.

| id | kind | position | lookAt | dwellMs |
|---|---|---|---|---|
| `enter` | glide | (0, 1.6, 0.5) | (0, 1.6, 4) | — |
| `pos-1` | combat | (0, 1.6, 5) | (-2, 1.6, 8) | 18000 |
| `pos-2` | combat | (0, 1.6, 12) | (4, 1.6, 14) | 22000 |
| `pos-3` | combat | (0, 1.6, 20) | (0, 1.6, 24) | 22000 |
| `exit` | glide | (0, 1.6, 23) | (0, 1.6, 25) | — |

## Cue list (screenplay)

Wall-clock times are level-relative (t=0 at level start). `on-arrive`/`on-clear` triggers fire when the camera-rail enters/early-exits the named node.

```ts
const lobbyCues: Cue[] = [
  // ── Glide-in (t = 0..3s) ────────────────────────────────────
  { id: 'amb-radio',       trigger: { kind: 'wall-clock', atMs:    0 }, action: { verb: 'ambience-fade', layerId: 'managers-only', toVolume: 0.55, durationMs: 1000 } },
  { id: 'narr-floor',      trigger: { kind: 'wall-clock', atMs:  300 }, action: { verb: 'narrator', text: 'LOBBY — FLOOR 1', durationMs: 1500 } },
  { id: 'door-revolving',  trigger: { kind: 'wall-clock', atMs:  500 }, action: { verb: 'door', doorId: 'door-revolving', to: 'open' } },

  // ── Position 1 — front desk (dwell 18s) ─────────────────────
  // Tutorial: door-burst at t=2 (relative to dwell), cover-pop at t=8, shamble at t=14
  { id: 'p1-tut-aim',      trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'narrator', text: 'DRAG TO AIM', durationMs: 2000 } },
  { id: 'p1-door-A',       trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'door', doorId: 'door-reception-side-A', to: 'open' } },
  { id: 'p1-spawn-A',      trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'enemy-spawn', railId: 'rail-spawn-reception-A', archetype: 'middle-manager', fireProgram: 'pistol-pop-aim' } },
  // (cover-pop and shamble also queue on-arrive; their fire-programs internally delay)
  { id: 'p1-spawn-cover',  trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'enemy-spawn', railId: 'rail-spawn-side-1', archetype: 'middle-manager', fireProgram: 'pistol-cover-pop' } },

  // ── Position 2 — concourse (dwell 22s) ──────────────────────
  { id: 'p2-amb-bump',     trigger: { kind: 'on-arrive', railNodeId: 'pos-2' }, action: { verb: 'ambience-fade', layerId: 'managers-only', toVolume: 0.7, durationMs: 800 } },
  { id: 'p2-door-N',       trigger: { kind: 'on-arrive', railNodeId: 'pos-2' }, action: { verb: 'door', doorId: 'door-north-wing', to: 'open' } },
  { id: 'p2-spawn-N',      trigger: { kind: 'on-arrive', railNodeId: 'pos-2' }, action: { verb: 'enemy-spawn', railId: 'rail-spawn-north-wing', archetype: 'middle-manager', fireProgram: 'pistol-pop-aim' } },
  { id: 'p2-door-S',       trigger: { kind: 'on-arrive', railNodeId: 'pos-2' }, action: { verb: 'door', doorId: 'door-south-wing', to: 'open' } },
  { id: 'p2-spawn-S',      trigger: { kind: 'on-arrive', railNodeId: 'pos-2' }, action: { verb: 'enemy-spawn', railId: 'rail-spawn-south-wing', archetype: 'middle-manager', fireProgram: 'pistol-cover-pop' } },
  { id: 'p2-civ-intern',   trigger: { kind: 'on-arrive', railNodeId: 'pos-2' }, action: { verb: 'civilian-spawn', railId: 'rail-civ-intern' } }, // walks during dwell
  { id: 'p2-vault',        trigger: { kind: 'on-arrive', railNodeId: 'pos-2' }, action: { verb: 'enemy-spawn', railId: 'rail-spawn-vault-couch', archetype: 'middle-manager', fireProgram: 'vault-drop-fire' } },

  // ── Position 3 — Garrison (dwell 22s) ───────────────────────
  { id: 'p3-elevator-ding',trigger: { kind: 'on-arrive', railNodeId: 'pos-3' }, action: { verb: 'audio-stinger', audio: 'stingers/elevator-ding.ogg' } },
  { id: 'p3-elevator-door',trigger: { kind: 'on-arrive', railNodeId: 'pos-3' }, action: { verb: 'door', doorId: 'door-elevator-B', to: 'open' } },
  { id: 'p3-clipboard',    trigger: { kind: 'on-arrive', railNodeId: 'pos-3' }, action: { verb: 'prop-anim', propId: 'prop-clipboard', animId: 'drop' } },
  { id: 'p3-spotlight',    trigger: { kind: 'on-arrive', railNodeId: 'pos-3' }, action: { verb: 'lighting', lightId: 'light-elevator-spot-B', tween: { kind: 'snap', intensity: 1.5 } } },
  { id: 'p3-boss-spawn',   trigger: { kind: 'on-arrive', railNodeId: 'pos-3' }, action: { verb: 'boss-spawn', bossId: 'garrison', phase: 1 } },
  // boss-phase transition is emitted by director on HP threshold (50%); not in this list.
  // boss death is also director-resolved.

  // ── Exit (on-clear of pos-3) ────────────────────────────────
  { id: 'exit-stinger',    trigger: { kind: 'on-clear', railNodeId: 'pos-3' }, action: { verb: 'audio-stinger', audio: 'stingers/garrison-down.ogg' } },
  { id: 'exit-elevator-A', trigger: { kind: 'on-clear', railNodeId: 'pos-3' }, action: { verb: 'door', doorId: 'door-elevator-A', to: 'open' } },
  { id: 'transition',      trigger: { kind: 'wall-clock', atMs: 73000 },        action: { verb: 'transition', toLevelId: 'stairway-A' } },
];
```

## Validation

- Average Lobby clear time on Normal: 70-80s
- First-time players shoot the intern: ~60% (target — too low means tutorial overlays are over-helpful)
- Garrison death rate by Phase 2: ~95% on Easy, ~80% on Normal, ~50% on Hard, ~25% on Nightmare, ~10% on UN
