---
title: Level 05 — HR Corridor
updated: 2026-04-30
status: current
domain: product
---

# Level 05 — HR Corridor

> The HR floor is the building's nervous system. Carpet that absorbs sound, motivational posters about "OPEN COMMUNICATION" hung at eye level, and behind every closed door, a closed-door conversation. HR Director Phelps wears a cardigan. Phelps has read every personnel file. Phelps knows the auditor's middle name. Phelps is going to use it.

## Theme

Beige carpet, beige walls, beige everything. The carpet is the loudest design choice — it's beige with a darker beige stripe pattern, swallowing footstep audio entirely (the player's own boots go silent here, which is a deliberate auditory cue). Frosted-glass office doors line the corridor; behind each, a silhouette is visible. Posters: "WE'RE ALL ON THE SAME TEAM," "FEEDBACK IS A GIFT," "REDUNDANCY IS A PROCESS."

Visual identity: **soft surfaces, hard intentions.** The horizontal claustrophobia of Open Plan returns but tighter — the corridor is narrower, doors are closer together, frosted glass means you can see silhouettes BEFORE the door bursts.

## Time budget

**Target: 75 seconds Normal**, comprising:

| Element | Seconds |
|---|---|
| Stairway B exit + ambience swap (boots go silent) | 4 |
| Combat Position 1 — corridor entry | 18 |
| Glide to position 2 (~5 units) | 4 |
| Combat Position 2 — hostage room | 22 |
| Glide to position 3 (~4 units) | 3 |
| Combat Position 3 — HR Director Phelps | 22 |
| Exit to Stairway C | 2 |
| **Total** | **75s** |

## Rail topology

```mermaid
graph LR
    Start([🚪 Stairway B<br/>Exit<br/>SPAWN])
    P1[🎯 Pos 1<br/>Corridor Entry<br/>18s]
    P2[🎯 Pos 2<br/>Hostage Room<br/>HOSTAGE BEATS<br/>22s]
    P3[💀 Pos 3<br/>Director Phelps<br/>22s]
    End([🚪 Stairway C<br/>EXIT])

    Start -- "4s" --> P1
    P1 -- "4s glide" --> P2
    P2 -- "3s glide" --> P3
    P3 -- "2s" --> End

    style Start fill:#1a3050,stroke:#fff
    style End fill:#3a3050,stroke:#fff
    style P2 fill:#503050,stroke:#fa0
    style P3 fill:#502020,stroke:#f00
```

Rail length: ~22 world units. Camera: level (no tilt — back to corridor mode).

## Combat Position 1 — Corridor Entry

### Setup

Three frosted-glass office doors on the left, two on the right. Behind each door, a silhouette is visible. Some silhouettes are seated (civilians, do not shoot through the door); some are standing aggressively (enemies, will burst). The player must read silhouette pose to anticipate.

### Encounter flow

```mermaid
sequenceDiagram
    autonumber
    participant Rail
    participant Door1
    participant Door2
    participant Door3
    participant Player

    Note over Rail: Rail stops at corridor entry, boots go silent

    Note over Door1: t=2s — silhouette stands
    Door1->>Player: door-burst<br/>Hitman
    Note over Player: Standing silhouette = aggression cue
    Player-->>Door1: Headshot

    Note over Door2: t=7s — silhouette stays seated
    Door2-->>Player: NO BURST (civilian behind door)
    Note over Player: HOLD FIRE — frosted-glass discipline test

    Note over Door3: t=10s
    Door3->>Player: door-burst<br/>Office Security Guard
    Player-->>Door3: Headshot

    Note over Door1: t=14s — silhouette turns
    Door1->>Player: cover-pop<br/>Hitman (uses doorframe)
    Player-->>Door1: Justice-shot glint

    Note over Rail: t=18s — Position cleared
```

### Beat list (Normal)

| t | Beat | Enemy | Notes |
|---|---|---|---|
| 2.0s | door-burst | hitman | Standing silhouette pre-cue |
| 7.0s | civilian-stayed | (none) | Seated silhouette — DO NOT SHOOT THROUGH |
| 10.0s | door-burst | office security guard | Standing silhouette pre-cue |
| 14.0s | cover-pop | hitman | Justice-shot glint |

Three enemies + 1 silhouette-civilian (passive). The silhouette mechanic is HR Corridor's signature — it asks the player to read motion behind frosted glass before the door opens.

## Combat Position 2 — Hostage Room

### Setup

A side-room visible through a half-glass partition (open to the corridor). Inside: an HR conference table, four chairs. **Three civilians are seated at the table, hands behind their heads.** Two office security guards with sidearms stand behind them. This is the **first hostage beat** of the run.

The player MUST kill the office security guards without hitting the civilians. Any civilian shot here is a -500 score penalty AND triggers a Director Phelps audio sting that he heard it.

### Encounter flow

```mermaid
sequenceDiagram
    autonumber
    participant Rail
    participant Hostage as Hostage Table
    participant SideDoor
    participant CorridorEnd
    participant Player

    Note over Rail: Rail stops at half-glass partition<br/>HOSTAGE SCENE visible

    Note over Hostage: t=2s — TITLE CARD: "HOSTAGES"
    Hostage->>Player: Two office security guards behind 3 civilians<br/>Civilians have hands raised
    Note over Player: 2 ORANGE reticles + 3 BLUE (civilian)<br/>Surgical fire only

    Note over Hostage: t=4s
    Hostage->>Player: hostage beat<br/>Left office security guard fires (deliberate miss)
    Player-->>Hostage: Headshot left office security guard

    Note over Hostage: t=8s
    Hostage->>Player: hostage beat<br/>Right office security guard repositions
    Note over Player: Civilian #2 in line of fire
    Player-->>Hostage: Wait for clear angle, headshot

    Note over SideDoor: t=14s
    SideDoor->>Player: door-burst<br/>Manager (sidearm)
    Note over Player: Civilians still seated
    Player-->>SideDoor: Headshot

    Note over CorridorEnd: t=18s
    CorridorEnd->>Player: charge<br/>Hitman (panic-charging from corridor end)
    Player-->>CorridorEnd: Sustained fire

    Note over Rail: t=22s — Hostages safe, position cleared
```

### Beat list (Normal)

| t | Beat | Enemy / Type | Notes |
|---|---|---|---|
| 2.0s | hostage-setup | 2 office security guards behind 3 civilians | Title card |
| 4.0s | hostage-beat | office security guard (left) | Surgical headshot |
| 8.0s | hostage-beat | office security guard (right) | Wait for clear angle |
| 14.0s | door-burst | manager | Side door |
| 18.0s | charge | hitman | From corridor end |

Four enemies + 3 hostage civilians. The hostage beat is HR Corridor's new vocabulary — civilians are not just walking through, they're staged as living shields.

## Combat Position 3 — Mini-Boss: HR Director Phelps

### Setup

The corridor ends at a frosted-glass door labeled "PHELPS — HR DIRECTOR." As the rail stops, the door swings open from inside; Phelps walks out calmly, holding a personnel file. He says, slowly, "I have your *file*, auditor." He drops the file, draws a sidearm from inside the cardigan.

### Phelps's spec

A new enemy — the "executive" archetype precursor. Same rigging as manager, but in a beige cardigan over white shirt; gray hair, reading glasses on a chain. Carries a personnel file as opening prop, drops it for the fight.

| Difficulty | HP | Phase 1 attack | Phase 2 attack |
|---|---|---|---|
| Easy | 120 | Sidearm shot every 1.5s | Three-round burst every 2.0s |
| Normal | 180 | Three-round burst every 1.8s | Five-round burst every 1.8s + 1 ad |
| Hard | 240 | Five-round burst every 1.8s | Five-round burst every 1.4s + 2 ads |
| Nightmare | 320 | Five-round burst every 1.4s + 1 ad | Spray + 3 ads + lob (binder) |
| Ultra Nightmare | 400 | Spray + 2 ads | Spray + 4 ads + lob + cover-pop |

Phase 1: Phelps fires from cover behind a steel HR filing cabinet rolled into the corridor as makeshift cover. Player must shoot the cabinet's hinges (mineable weakpoint) to remove the cover and expose Phelps.

Phase 2 (HP threshold 50%): Phelps retreats into his office, opens a hidden cabinet of personnel files, and **lobs binders at the player** as a damage-over-time projectile (each binder is a slow-arcing red-reticle target the player can shoot down mid-air for 100 score). Ads spawn from the corridor doors revisiting earlier silhouettes.

Weakpoint: head (250 score) or **glasses** (350 score — comedic, glasses-shatter SFX). Justice-shot disarms the sidearm.

### Encounter flow

```mermaid
sequenceDiagram
    autonumber
    participant Rail
    participant Phelps
    participant Cabinet as Filing Cabinet
    participant Ads
    participant Player

    Note over Rail: Rail stops at corridor end
    Note over Phelps: t=2s — Phelps walks out<br/>"I have your file, auditor."
    Phelps->>Phelps: Drops file<br/>Draws sidearm from cardigan
    Phelps->>Player: 🎯 ENTERS<br/>Title card: "HR DIRECTOR PHELPS"

    Note over Phelps: PHASE 1 — cover behind cabinet
    loop Phase 1 — burst from cover
        Phelps->>Player: Three-round burst (1.8s)
        Player-->>Cabinet: Shoot hinges (3 hits to break)
        Player-->>Phelps: Headshots when cover breaks
    end

    Note over Phelps: HP 50% threshold
    Phelps->>Phelps: Retreats to office<br/>"PHASE 2"

    loop Phase 2 — binder lobs + ads
        Phelps->>Player: Binder lob (red-reticle arc)
        Note over Ads: 1 ad spawns from earlier corridor door
        Player-->>Phelps: Shoot binder mid-air OR shoot Phelps
        Player-->>Ads: Clear ads
    end

    Phelps->>Phelps: Death animation (3s)<br/>Glasses shatter on floor<br/>"PHELPS DOWN" stinger

    Note over Rail: Rail resumes toward Stairway C
```

## Set pieces

1. **The frosted-glass silhouette read (Pos 1).** First time the player must distinguish enemy intent from a silhouette pose BEFORE the door opens. Standing aggressive = enemy. Seated relaxed = civilian. The cue MUST be visually unambiguous — playtest for read clarity.

2. **The hostage scene (Pos 2).** First time civilians are not just walking through but are staged in danger. The penalty for hitting one is doubled here — and the audio sting from Phelps tells the player he heard the mistake.

3. **Phelps's "I have your file" entrance (Pos 3).** A cold, slow entrance that contrasts with Whitcomb's coffee-throwing rage. Phelps is the calm villain. The dropped file rests on the floor and is shootable for 50 score (comedic, no narrative weight).

4. **The binder lobs (Phase 2).** First time the player encounters a projectile they can shoot down mid-air. Establishes the lob beat vocabulary for use in Boardroom (Reaper's subpoena throw).

## Civilians

| Position | Civilian | Archetype |
|---|---|---|
| 1 | 1 silhouette-civilian (behind frosted door — passive) | random office worker |
| 2 | 3 hostages (seated, hands raised) | random office workers |
| 3 | none (boss fight) | — |

## Audio

- **Ambience layer**: `ambience-fluorescent-hum.ogg` — sterile, almost too quiet
- **Boots go silent**: footstep mix attenuated -100% (deliberate auditory cue at corridor entry)
- **Phelps voice line**: dry, low, deliberate cadence. "I have your *file*, auditor." Recorded once, NEVER repeats.
- **Glasses shatter**: high-frequency tinkle on Phelps weakpoint hit
- **Hostage sting**: low brass + heartbeat layer when hostages are in scene
- **Death stinger**: file-folder-thud + filing-cabinet-clang

## Memory budget

Persistent from Stairway B: hands, staple-rifle, manager + office security guard + hitman GLBs. Loaded for HR Corridor: HR-corridor-tile floor, frosted-glass-door GLB (instanced 5 times), HR poster prop variants (instanced 3-4 times), filing-cabinet GLB (instanced 1× as Phelps cover, others reused from Workbench prop pool), Phelps cardigan material LUT, hostage chair-set GLB, **executive-tier voice line bank** (shared with future Crawford + Reaper).

Total VRAM during HR Corridor: ~30 MB.

Disposal: when entering Stairway C, dispose all HR-exclusive geometry (frosted doors, posters, hostage chairs, Phelps's cabinet, Phelps's GLB). Keep manager + office security guard + hitman GLBs loaded (reused in Executive Suites).

## Authoring notes

- The frosted-glass silhouette pose is a separate billboarded plane behind each door, NOT a real character mesh. Use a low-res silhouette texture per pose (seated, standing-aggressive, standing-passive) and swap it in advance of the beat. This is much cheaper than rendering a hidden full character.
- The boots-go-silent transition is a single audio bus attenuator on rail-cross into the corridor; revert at exit.
- Hostage civilians use the same animation rig as the consultant civilian, but blend-locked to a "hands-raised seated" pose. No need for a new GLB; pose-only variant.
- Phelps's binder-lob projectile reuses the staple-rifle bullet emitter swapped to a binder mesh with arc gravity. The arc must be slow enough that the player has ~1.0s to shoot it down at Normal difficulty.
- The personnel-file dropped-on-floor prop is a static mesh at Phelps's entry position; raycast hit registers a 50-score "joke shot" event.

## Construction primitives

Long narrow corridor with frosted-glass doors flanking both walls. Filing-cabinet rows define cover for Phelps's office at the far end.

### Floors / ceiling

| id | kind | origin | size | PBR |
|---|---|---|---|---|
| `floor-corridor` | floor | (0, 0, 12) | 6 × 24 | `carpet` (dark grey tint) |
| `ceiling-flicker` | ceiling | (0, 3, 12) | 6 × 24 | `ceiling-tile`, height 3, 8 emissive cutouts; every other one off OR flickering at 3Hz |

### Walls

| id | kind | origin | size | overlay |
|---|---|---|---|---|
| `wall-east` | wall | (3, 0, 12) | 24 × 3 | drywall (sterile light-grey tint) |
| `wall-west` | wall | (-3, 0, 12) | 24 × 3 | drywall |
| `wall-end` | wall | (0, 0, 24) | 6 × 3 | drywall + `T_Window_Wood_026.png` overlay (HR DEPARTMENT signage) |

### Doors (frosted-glass, alternating sides)

| id | kind | origin | texture | family | spawnRailId |
|---|---|---|---|---|---|
| `door-frosted-W1` | door | (-3, 0, 4) | `T_Window_GlassBricks_00.png` (used as door — frosted) | wood | `rail-spawn-frosted-W1` |
| `door-frosted-E1` | door | (3, 0, 6) | `T_Window_GlassBricks_01.png` | wood | `rail-spawn-frosted-E1-civilian-passive` |
| `door-frosted-W2` | door | (-3, 0, 8) | `T_Window_Vinyl_001.png` | wood | `rail-spawn-frosted-W2` |
| `door-frosted-E2` | door | (3, 0, 10) | `T_Window_GlassBricks_00.png` | wood | `rail-spawn-frosted-E2-aggressive` |
| `door-frosted-W3` | door | (-3, 0, 14) | `T_Window_GlassBricks_01.png` | wood | (silhouette only — passive civ) |
| `door-frosted-E3-hostage` | door | (3, 0, 16) | `T_Window_Vinyl_002.png` | wood | `rail-spawn-hostage-host` |
| `door-phelps-office` | door | (0, 0, 24) | `T_Door_Wood_026.png` | wood | `rail-spawn-phelps` |

### Whiteboards & posters

| id | kind | origin | caption |
|---|---|---|---|
| `wb-hr-mission` | whiteboard | (-3, 1.5, 11) | "HR MISSION: COMPLIANCE" |
| `wb-policy-update` | whiteboard | (3, 1.5, 19) | "POLICY 47.B — REORG ACK FORM" |

### Props & lights

| id | kind | spec |
|---|---|---|
| `prop-filing-cabinet-row-A` | prop | `props/cabinet-1.glb` instanced 4× along east wall |
| `prop-filing-cabinet-row-B` | prop | `props/cabinet-2.glb` instanced 4× along west wall |
| `prop-phelps-desk` | prop | `props/desk.glb` at (0, 0, 23.5) |
| `prop-phelps-cabinet-cover` | prop | `props/cabinet-3.glb` at (0, 0, 22) (Phelps's Phase 1 cover — destructible) |
| `prop-personnel-file` | prop | `traps/trap-19.glb` at (0, 0, 23) (animated drop on Phelps spawn) |
| `light-flicker-A` | point | (0, 2.8, 6), color (1.0, 1.0, 0.95), intensity 0.3 — 3Hz flicker |
| `light-flicker-B` | point | (0, 2.8, 14), color (1.0, 1.0, 0.95), intensity 0.4 — steady |
| `light-phelps-spot` | spot | (0, 2.8, 23), pointing -Z, intensity 0.0 (snaps on at boss reveal) |

## Spawn rails

| id | path | speed | loop |
|---|---|---|---|
| `rail-spawn-frosted-W1` | (-4, 0, 4) → (-3, 0, 4) → (-2, 0, 4.5) | 2.0 m/s | false |
| `rail-spawn-frosted-E1-civilian-passive` | (4, 0, 6) → (3.5, 0, 6) | 0.5 m/s | false |
| `rail-spawn-frosted-W2` | (-4, 0, 8) → (-3, 0, 8) → (-2, 0, 8.5) | 2.0 m/s | false |
| `rail-spawn-frosted-E2-aggressive` | (4, 0, 10) → (3, 0, 10) → (2, 0, 10.5) | 2.5 m/s | false |
| `rail-spawn-hostage-host` | (4, 0, 16) → (3, 0, 16) → (2, 0, 16) | 2.0 m/s | false |
| `rail-civ-hostage-1` | (3.5, 0, 16) → (3, 0, 16) | 0.0 m/s (stationary) | false |
| `rail-civ-hostage-2` | (3.5, 0, 16.5) → (3, 0, 16.5) | 0.0 m/s | false |
| `rail-civ-hostage-3` | (3.5, 0, 17) → (3, 0, 17) | 0.0 m/s | false |
| `rail-spawn-phelps` | (0, 0, 25) → (0, 0, 23.5) → (0, 0, 22.5) | 1.5 m/s | false |

## Camera-rail nodes

| id | kind | position | lookAt | dwellMs |
|---|---|---|---|---|
| `enter` | glide | (0, 1.6, 0.5) | (0, 1.6, 4) | — |
| `pos-1` | combat | (0, 1.6, 6) | (-3, 1.6, 4) | 18000 |
| `pos-2-hostage` | combat | (0, 1.6, 14) | (3, 1.6, 16) | 22000 |
| `pos-3-phelps` | combat | (0, 1.6, 21) | (0, 1.6, 24) | 22000 |
| `exit` | glide | (0, 1.6, 23) | (0, 1.6, 25) | — |

## Cue list (screenplay)

```ts
const hrCorridorCues: Cue[] = [
  { id: 'amb-fade',    trigger: { kind: 'wall-clock', atMs: 0 }, action: { verb: 'ambience-fade', layerId: 'tense-drone', toVolume: 0.6, durationMs: 1500 } },
  { id: 'flicker',     trigger: { kind: 'wall-clock', atMs: 0 }, action: { verb: 'lighting', lightId: 'light-flicker-A', tween: { kind: 'flicker', minIntensity: 0.1, maxIntensity: 0.4, hz: 3, durationMs: 75000 } } },
  { id: 'narr-floor',  trigger: { kind: 'wall-clock', atMs: 300 }, action: { verb: 'narrator', text: 'HUMAN RESOURCES — FLOOR 19', durationMs: 1500 } },

  // Position 1 — silhouette read
  { id: 'p1-door-W1',  trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'door', doorId: 'door-frosted-W1', to: 'open' } },
  { id: 'p1-spawn-W1', trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'enemy-spawn', railId: 'rail-spawn-frosted-W1', archetype: 'hitman', fireProgram: 'pistol-pop-aim' } },
  { id: 'p1-door-W2',  trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'door', doorId: 'door-frosted-W2', to: 'open' } },
  { id: 'p1-spawn-W2', trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'enemy-spawn', railId: 'rail-spawn-frosted-W2', archetype: 'security-guard', fireProgram: 'pistol-cover-pop' } },
  { id: 'p1-door-E2',  trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'door', doorId: 'door-frosted-E2', to: 'open' } },
  { id: 'p1-spawn-E2', trigger: { kind: 'on-arrive', railNodeId: 'pos-1' }, action: { verb: 'enemy-spawn', railId: 'rail-spawn-frosted-E2-aggressive', archetype: 'hitman', fireProgram: 'pistol-cover-pop' } },

  // Position 2 — hostage scene
  { id: 'p2-stinger',  trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' }, action: { verb: 'audio-stinger', audio: 'stingers/hostage-low-brass.ogg' } },
  { id: 'p2-civ-1',    trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' }, action: { verb: 'civilian-spawn', railId: 'rail-civ-hostage-1' } },
  { id: 'p2-civ-2',    trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' }, action: { verb: 'civilian-spawn', railId: 'rail-civ-hostage-2' } },
  { id: 'p2-civ-3',    trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' }, action: { verb: 'civilian-spawn', railId: 'rail-civ-hostage-3' } },
  { id: 'p2-door-host',trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' }, action: { verb: 'door', doorId: 'door-frosted-E3-hostage', to: 'open' } },
  { id: 'p2-host-spawn',trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' }, action: { verb: 'enemy-spawn', railId: 'rail-spawn-hostage-host', archetype: 'hitman', fireProgram: 'hostage-threat' } },

  // Position 3 — Phelps
  { id: 'p3-power-out', trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' }, action: { verb: 'level-event', event: 'power-out' } },
  { id: 'p3-spotlight', trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' }, action: { verb: 'lighting', lightId: 'light-phelps-spot', tween: { kind: 'snap', intensity: 1.5 } } },
  { id: 'p3-stinger',   trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' }, action: { verb: 'audio-stinger', audio: 'stingers/phelps-i-have-your-file.ogg' } },
  { id: 'p3-file-drop', trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' }, action: { verb: 'prop-anim', propId: 'prop-personnel-file', animId: 'drop' } },
  { id: 'p3-door',      trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' }, action: { verb: 'door', doorId: 'door-phelps-office', to: 'open' } },
  { id: 'p3-boss',      trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' }, action: { verb: 'boss-spawn', bossId: 'phelps', phase: 1 } },

  { id: 'exit-restore', trigger: { kind: 'on-clear', railNodeId: 'pos-3-phelps' }, action: { verb: 'level-event', event: 'lights-restored' } },
  { id: 'transition',   trigger: { kind: 'wall-clock', atMs: 75000 }, action: { verb: 'transition', toLevelId: 'stairway-C' } },
];
```

## Validation

- Average HR Corridor clear on Normal: 70-80s
- **Hostage civilian-shooting rate**: <10% on Normal (this is the strictest checkpoint — the hostage beat must be readable)
- Frosted-glass silhouette read accuracy: >85% — players should NOT be shooting through doors at seated silhouettes
- Phelps Phase 2 reach rate: >85% (cabinet break is the gating skill check)
- Phelps death rate by 30s: ~75% Normal, ~45% Hard, ~20% Nightmare, ~8% UN
