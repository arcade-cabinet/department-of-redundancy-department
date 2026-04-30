---
title: Level 06 — Stairway C
updated: 2026-04-30
status: current
domain: product
---

# Level 06 — Stairway C

> Phelps is dead. The auditor takes the executive stairs. These aren't the back-of-house service stairs — these are panelled walnut, brass handrails, oil paintings of past Directors of Operations on the wall. The building is now PERSONALLY offended. The resistance here is a defense, not a delay.

## Theme

Walnut panelling, brass-rail bannisters, plush red carpet runner up the center of the stairs. Oil paintings of grim, sepia-toned executives line the walls (each painting's eyes follow the rail — a deliberate horror-cabinet beat). Crystal chandelier overhead at the upper landing. The air feels expensive.

The visual identity contrasts brutally with Stairways A and B: those were industrial; this is **executive opulence weaponized.** The tilt-up returns at -25°, but the camera also adds a slight roll oscillation (~2° peak) on the rail to convey unease.

## Time budget

**Target: 120 seconds Normal**, comprising:

| Element | Seconds |
|---|---|
| Tilt transition + theme swap (carpet swallows boots again) | 4 |
| Combat Position 1 — lower flight | 28 |
| Climb to first landing | 8 |
| Combat Position 2 — first landing wave | 32 |
| Climb to mid-stair (oil-painting hallway) | 10 |
| Combat Position 3 — chandelier landing | 32 |
| Final climb to Executive door | 6 |
| **Total** | **120s** |

Twice the length of Stairway A and 33% longer than Stairway B. Three combat positions (vs. 2 in A and B). This is the longest stairway and the pre-boss difficulty peak.

## Rail topology

```mermaid
graph TB
    Top([🚪 Executive<br/>Suites Door<br/>EXIT])
    P3[💀 Pos 3<br/>Chandelier<br/>Landing<br/>32s]
    P2[🎯 Pos 2<br/>First Landing<br/>Wave<br/>32s]
    P1[🎯 Pos 1<br/>Lower Flight<br/>28s]
    Bottom([🚪 HR Corridor<br/>Stair Door<br/>SPAWN])

    Bottom -- "4s tilt + climb" --> P1
    P1 -- "8s climb" --> P2
    P2 -- "10s climb<br/>(oil-painting hallway)" --> P3
    P3 -- "6s exit" --> Top

    style Bottom fill:#1a3050,stroke:#fff
    style Top fill:#3a3050,stroke:#fff
    style P3 fill:#502020,stroke:#f00
```

Rail length: ~30 world units of vertical climb. Camera pitch: -25° base + ±2° roll oscillation.

## Combat Position 1 — Lower Flight

### Setup

The bottom of the executive stairwell. Two oil paintings flank the player at eye level on the lower wall — both portraits of Directors of Operations past, both staring directly at camera. The first painting has a hidden door behind it (will swing open later); the second is just dressing.

### Encounter flow

```mermaid
sequenceDiagram
    autonumber
    participant Rail
    participant PaintingDoor
    participant LowerWell
    participant UpperFlight
    participant Player

    Note over Rail: Rail stops on lower flight, camera tilt -25°

    Note over PaintingDoor: t=2s — painting hinges
    PaintingDoor->>Player: door-burst<br/>Hitman (from behind painting)
    Note over Player: New variant: hidden-door reveal
    Player-->>PaintingDoor: Headshot

    Note over UpperFlight: t=8s
    UpperFlight->>Player: cover-pop<br/>Policeman
    Player-->>UpperFlight: Time peek

    Note over LowerWell: t=12s
    LowerWell->>Player: crawler ×2<br/>Hitman + Policeman
    Note over Player: Hitman-tier crawler — fast lunge
    Player-->>LowerWell: Sweep — prioritize hitman

    Note over UpperFlight: t=20s
    UpperFlight->>Player: vault-drop<br/>Hitman from upper bannister
    Note over Player: Vertical priority — quick draw
    Player-->>UpperFlight: Mid-air shot

    Note over Rail: t=24s
    Rail->>Player: charge<br/>Policeman from lower well
    Player-->>Rail: Sustained fire

    Note over Rail: t=28s — Position cleared
```

### Beat list (Normal)

| t | Beat | Enemy | Notes |
|---|---|---|---|
| 2.0s | door-burst (hidden) | hitman | First hidden-door reveal |
| 8.0s | cover-pop | policeman | Upper flight |
| 12.0s | crawler ×2 | hitman + policeman | Lower well |
| 20.0s | vault-drop | hitman | From upper bannister |
| 24.0s | charge | policeman | Lower well |

Six enemies. The hidden-door reveal is Stairway C's signature new beat — paintings, vases, even one wall section will swing open as enemy doors. The player can't trust visual environment cues to mean "scenery only."

## Combat Position 2 — First Landing Wave

### Setup

Top of the first flight — a wide landing, brass railing on both sides overlooking the lower well. Four doors visible on this landing (more than any prior position): two left, two right. A potted fern stands in each corner (mineable, drops ammo). The chandelier is visible above through a circular ceiling cutout but not yet directly overhead.

### Encounter flow

```mermaid
sequenceDiagram
    autonumber
    participant Rail
    participant Doors as 4 Doors
    participant Bannister
    participant Player

    Note over Rail: Rail at first landing — tilted to look at chandelier briefly

    Note over Doors: t=3s — synchronized creak (wider mass-pop)
    par Left Doors
        Doors->>Player: door-burst (×2)<br/>Hitman + Policeman
    and Right Doors
        Doors->>Player: door-burst (×2)<br/>Policeman + Manager
    end

    Note over Player: 4 simultaneous orange reticles<br/>Sweep-fire moment

    Note over Bannister: t=14s — over-the-rail vault
    Bannister->>Player: vault-drop ×2<br/>Two hitmen vault from above bannister
    Note over Player: Look UP — secondary mass-pop
    Player-->>Bannister: Two mid-air shots

    Note over Doors: t=22s — second wave from same doors
    Doors->>Player: cover-pop ×2<br/>Hitman left + Policeman right
    Player-->>Doors: Justice-shot opportunity (left hitman glint)

    Note over Rail: t=28s — optional crate-pop
    Rail->>Player: Potted fern (ammo, optional)

    Note over Rail: t=32s — Position cleared
```

### Beat list (Normal)

| t | Beat | Enemy | Notes |
|---|---|---|---|
| 3.0s | mass-pop ×4 | hitman + policeman + policeman + manager | 4-door synchronized burst |
| 14.0s | vault-drop ×2 | hitman + hitman | Over-the-bannister |
| 22.0s | cover-pop ×2 | hitman + policeman | Door cycles |
| 28.0s | crate-pop | potted fern (optional) | Ammo |

Eight enemies + 1 optional crate. Larger than any prior mass-pop. The over-the-bannister vault-drop layer is new — the player must scan vertically AND horizontally simultaneously.

## Combat Position 3 — Chandelier Landing

### Setup

The mid-stair landing directly under the crystal chandelier. The chandelier is **mineable** — shoot it during this fight and it crashes down on the landing for area-clear damage to all enemies on the landing (a once-per-fight tactical option, like a smart-bomb pickup).

The combat opens with a **rooftop-sniper beat** — a hitman is positioned on the upper bannister of the next flight up, taking a slow charge-shot on the player. The chandelier, when crashed, takes out everyone on the floor but does NOT reach the upper-bannister sniper.

### Encounter flow

```mermaid
sequenceDiagram
    autonumber
    participant Rail
    participant Sniper as Upper-Bannister<br/>Sniper
    participant Chandelier
    participant Doors
    participant LowerWell
    participant Player

    Note over Rail: Rail stops under chandelier, slight roll oscillation

    Note over Sniper: t=2s — laser sight visible
    Sniper->>Player: rooftop-sniper<br/>Hitman charging shot (3s wind-up)
    Note over Player: Long-range threat — must headshot before commit
    Player-->>Sniper: Sustained fire OR break LOS

    Note over Doors: t=8s
    Doors->>Player: door-burst ×2<br/>Two policemen
    Player-->>Doors: Headshots

    Note over LowerWell: t=14s
    LowerWell->>Player: crawler<br/>Hitman from lower well
    Player-->>LowerWell: Quick draw

    Note over Chandelier: t=18s — tactical opportunity
    Chandelier-->>Player: Mineable<br/>Crashes down on shot, area-damage
    Note over Player: Decision: save for ad-rush or use now?

    Note over Doors: t=22s — ad rush (if chandelier unused)
    Doors->>Player: door-burst ×3<br/>Manager + Policeman + Hitman
    Note over Player: 3-target sweep OR drop chandelier
    Player-->>Doors: Sweep OR chandelier crash

    Note over Sniper: t=28s — second sniper shot
    Sniper->>Player: rooftop-sniper<br/>(only if not killed earlier)
    Player-->>Sniper: Headshot

    Note over Rail: t=32s — Position cleared
```

### Beat list (Normal)

| t | Beat | Enemy | Notes |
|---|---|---|---|
| 2.0s | rooftop-sniper | hitman | Upper bannister, laser-sight cue |
| 8.0s | door-burst ×2 | policeman + policeman | Landing doors |
| 14.0s | crawler | hitman | Lower well |
| 18.0s | (mineable) | chandelier | Tactical area-clear, optional |
| 22.0s | door-burst ×3 | manager + policeman + hitman | Ad rush |
| 28.0s | rooftop-sniper (cond.) | hitman | Only fires if not killed at t=2s |

Six enemies + 3 ad-rush + 1 conditional sniper repeat = up to 10 enemies. The chandelier is a **tactical pickup** — the player chooses when to use it. This is the first taste of player tactical agency beyond shoot/cover.

## Set pieces

1. **The painting hidden-door (Pos 1, t=2s).** The first time a piece of "scenery" is revealed as an enemy spawn point. Sets up the run's final-act paranoia — anything could be a door now.

2. **The over-the-bannister vault-drop (Pos 2, t=14s).** First time enemies attack from a vertical direction the player can't see without explicit camera-up. Forces 3D scanning.

3. **The chandelier (Pos 3, t=18s).** First mineable tactical object that does AOE damage. Establishes the tactical-environment vocabulary used in Executive Suites and Boardroom (panic button, fire alarm, executive desk lamp).

4. **The oil-painting hallway between Pos 2 and Pos 3.** Rail glides past 6-8 portraits of past Directors of Operations. The eyes follow the camera. Each portrait's nameplate reads a date — they get progressively more recent. The last portrait is blank. (Foreshadowing.)

## Civilians

None. Even the executive stairwell is purged — the building has cleared civilians from the upper floors.

## Pickup placement

| Position | Pickup |
|---|---|
| 1 | None |
| 2 | Potted fern (crate-pop, ammo, optional) |
| 3 | Crystal chandelier (mineable, AOE smart-bomb, single use) |

## Audio

- **Ambience layer**: `ambience-clock-tick.ogg` — a slow grandfather-clock tick, deliberately old-fashioned. Sets the executive-floor unease.
- **Tilt transition**: muffled crescendo into ambience
- **Hidden-door painting hinge**: wood creak + dust-puff SFX
- **Mass-pop creak**: 4 doors synchronized within 50ms
- **Chandelier crash**: glass-shatter cascade + brass-bell BOOM, ~2s sustain
- **Sniper laser-sight**: subtle pure-tone whine during wind-up — directional audio cue

## Memory budget

Persistent from HR Corridor: hands, staple-rifle, manager + policeman + hitman GLBs. Loaded for Stairway C: walnut-stair GLB (NEW — not the metal stairs from A/B), brass-rail prop, oil-painting GLB (instanced 8-10 times with material variants per portrait), chandelier-GLB (single instance), red-carpet-runner GLB, hidden-door-painting variant.

Total VRAM during Stairway C: ~33 MB (3 MB net add — walnut stair material + chandelier offsets disposed Stairway A/B metal stairs).

Disposal: when entering Executive Suites, dispose all stair-exclusive geometry (walnut stairs, oil paintings, chandelier), but keep red-carpet-runner GLB loaded (reused in Executive Suites).

## Authoring notes

- The painting-eyes-follow-camera effect is a per-portrait shader using a billboard quad masked to the eye region only. Cheap and uncanny. Don't apply to all portraits — only the 4 closest to the rail (anything further is invisible to camera).
- The chandelier mineable: 100 HP, takes 5 hits from staple-rifle to break. AOE on crash kills all enemies within 3 units of the landing center (excluding the upper-bannister sniper by design).
- The hidden-door painting reveals: the painting flips outward on a vertical hinge to its left. Use a single rotation animation on the painting node, no need for a separate door behind it.
- The slight roll oscillation on the rail: ±2° peak, sinusoidal, period 4s. Apply to camera quaternion, not the rail itself.
- Sniper laser-sight: a thin red emissive line from sniper position to player rail position. Only visible during wind-up (3s on Normal). The line MUST be unmissable but should not block targeting reticle visibility.

## Validation

- Average Stairway C clear on Normal: 110-130s
- Player health average at Pos 3 entry: should be 60-80% (this is the pre-boss attrition peak)
- Chandelier usage rate: ~70% of players use it during ad-rush at t=22s. If lower, telegraph it harder via reticle highlight.
- Sniper kill-before-commit rate: >75% on Normal (reticle wind-up is generous on Normal; tighter on Hard+)
- Hidden-door painting recognition: subjective playtest — players should NOT die to hidden-door surprises. The painting hinge should be telegraphed by a visible squeak + dust-puff before the burst.
