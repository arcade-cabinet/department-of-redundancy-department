---
title: Encounter Vocabulary
updated: 2026-04-30
status: current
domain: technical
---

# Encounter Vocabulary

This is the canon list of **archetypes**, **fire patterns**, and **cease conditions** — the three things the screenplay director combines to spawn an enemy.

The architecture is **dumb props on rails**. An enemy is a GLB instance that slides along an authored spawn rail, ticks an authored fire-program tape, and dies when the director's accumulated player-hit damage exceeds its HP. The enemy decides nothing.

```
{ archetype, fireProgram, ceaseAfterMs?, spawnRailId } → director instantiates an enemy
```

Levels never invent archetypes or fire programs — they pick from the tables below. Adding a new entry to either table requires a doc-canon edit (this file), a fire-program preset (`src/encounter/firePatterns.ts`), and at most one new GLB.

## Archetype table

An archetype is a stat-line + weakpoint map. The GLB asset is shared across the four canonical attacker archetypes by reskinning the material LUT (each archetype has a distinct material tint). The fifth and sixth archetypes (intern/consultant/executive) are non-combat civilians; the seventh (Reaper) is the final boss.

| Archetype id | GLB | HP | Weakpoint | Justice-shot target | Body damage | Head damage | Civilian? |
|---|---|---|---|---|---|---|---|
| `security-guard` | `policeman.glb` | 80 | head | weapon-hand | 100 | 250 | no |
| `middle-manager` | `middle-manager.glb` | 60 | head | tie-knot | 100 | 250 | no |
| `hitman` | `hitman.glb` | 100 | head | weapon-hand | 100 | 250 | no |
| `swat` | `swat.glb` | 140 | head (helmet halves head damage) | weapon-hand | 100 | 250 | no |
| `intern` | `(office-worker-intern.glb)` ※ | n/a | n/a | n/a | n/a | n/a | yes |
| `consultant` | `(office-worker-consultant.glb)` ※ | n/a | n/a | n/a | n/a | n/a | yes |
| `executive` | `(office-worker-executive.glb)` ※ | n/a | n/a | n/a | n/a | n/a | yes |
| `reaper` | `hr-reaper.glb` | 1500 (Phase 1) / 1800 (Phase 2) / 2200 (Phase 3) | scythe-jewel (Phase 3 only); body otherwise | scythe-shaft | varies | varies | no |

※ Three civilian GLBs are not yet in `public/assets/models/characters/`. Marked as a content TODO; the level docs reference them by archetype id only.

Mini-boss archetypes (Garrison / Whitcomb / Phelps / Crawford) are **special-case archetype overrides** with bespoke HP, fire programs, and skin tints — defined in their respective level docs (01-lobby, 03-open-plan, 05-hr-corridor, 07-executive-suites). They are not in this canonical table.

## Fire-program table

A fire program is a **tape** keyed off rail-progress (0..1 along the spawn rail) and emit time (relative to enemy spawn). The director plays the tape and processes the events.

```ts
interface FireProgram {
  id: string;
  events: FireEvent[];
  loop: boolean;        // false = play once, true = loop until cease
}

type FireEvent =
  | { atMs: number; verb: 'aim-laser'; durationMs: number }   // reticle goes orange
  | { atMs: number; verb: 'fire-hitscan'; damage: number }    // reticle goes red, instant hit
  | { atMs: number; verb: 'projectile-throw'; damage: number; ttlMs: number }  // arc, can be shot down
  | { atMs: number; verb: 'melee-contact'; damage: number; rangeM: number }     // close-range damage
  | { atMs: number; verb: 'duck' }                            // hide behind cover briefly
  | { atMs: number; verb: 'pop-out' }                         // emerge from cover
  | { atMs: number; verb: 'idle' };                           // stand exposed, no fire
```

The 16 canonical fire programs map to the 16 beats from the genre lineage (Time Crisis, House of the Dead, Virtua Cop, Crisis Zone, Operation Wolf). Each is a preset; levels reference them by id.

| Program id | Pattern | Use when |
|---|---|---|
| `pistol-pop-aim` | aim 0.8s → fire 1× → idle | Standard door-burst exit |
| `pistol-cover-pop` | duck 0.5s → pop-out → aim 0.5s → fire → duck. loop. | Cover-pop chains |
| `vault-drop-fire` | (slides along rail at high speed) → aim 0.5s → fire 1× | Vault-drop landings |
| `crawler-lunge` | aim 1.5s → melee 1.5s | Floor-level lunge attacks |
| `shamble-march` | (very slow rail; idle the whole way) → melee on arrive | Background shambles |
| `charge-sprint` | (very fast rail; idle the whole way) → melee on arrive | Charge punisher |
| `vehicle-dismount-burst` | aim 0.4s → fire 1× → aim 0.4s → fire 1× | Multi-shooter beats |
| `drive-by-volley` | (fast rail traversal) → fire 1× at midpoint | Drive-by encounters |
| `sniper-aim` | aim 1.5s → fire 1× (35 damage) → idle 1s. loop. | Rooftop sniper |
| `lob-throw` | aim 1.0s → projectile 25 damage 1.5s ttl. loop every 2.5s. | Stapler/coffee-cup grenade |
| `hostage-threat` | aim 2.5s → fire (50 damage on player + civilian-loss) | Hostage situation |
| `mass-pop-volley` | (variant of `pistol-cover-pop` synchronised by director across N enemies) | Climax mass-fire |
| `justice-glint` | aim 0.3s with weapon-hand glint → fire | Justice-shot opportunity (overlay onto host) |
| `boss-phase-N` | per-boss bespoke; defined in boss level doc | Bosses only |
| `civilian-walk` | idle the whole way along rail | Non-combat |
| `mini-boss-bespoke` | per-mini-boss; defined in level doc | Mini-bosses only |
| `pre-aggro-pistol-pop` | idle 2500ms (or until `on-alert`) → `pistol-pop-aim` | Pre-aggro tableau (Executive Suites Position 2) — enemy is visible but unaware until alerted |

The `on-alert` signal is emitted by the director when (a) the player fires, (b) a sibling enemy in the same dwell is killed, or (c) 5000ms elapses. The `pre-aggro-pistol-pop` `idle` event listens for this signal and skips to `pistol-pop-aim` immediately on receipt.

Fire programs run from spawn until either:
- the enemy is killed (HP ≤ 0),
- the director calls `cease()` (camera left dwell, or `ceaseAfterMs` elapsed),
- for non-`loop` programs, the program runs to its end and the prop becomes idle.

The director processes events:
- `aim-laser` → flips the enemy's reticle marker to orange, with the per-difficulty wind-up multiplier applied.
- `fire-hitscan` → the player loses HP unless they entered cover before this event tick.
- `projectile-throw` → spawns an arc projectile; the player can shoot it down OR enter cover before TTL expires.
- `melee-contact` → if the player has not killed the enemy by this tick, deal damage.
- `duck` / `pop-out` / `idle` → animation state changes only; no gameplay effect.

## Cease conditions

```ts
type CeaseCondition =
  | { kind: 'on-camera-leaves-dwell' }         // implicit default
  | { kind: 'after-ms'; ms: number }           // explicit timeout
  | { kind: 'on-clear'; railNodeId: string }   // when sibling enemies clear
  | { kind: 'never' };                         // boss only
```

`cease()` is **always** called on an enemy by the director. It is never called by the enemy itself. Cease causes the prop to animate retreating along its spawn rail (reverse path) and despawn. Killed enemies skip cease — they go directly to the death-animation + despawn pipeline.

## Behaviour patterns (the 16 beats reinterpreted)

These are the genre-lineage beats, each composed of `archetype + fire-program + (door|shutter|prop-anim cue) + spawn rail`.

### Door-burst

| Component | Value |
|---|---|
| Trigger | `on-arrive` at combat position |
| Door cue | `door` to `open` (from authored Door primitive) |
| Spawn cue | `enemy-spawn` on the door's `spawnRailId` |
| Archetype | typically `security-guard` or `middle-manager`; level-driven |
| Fire program | `pistol-pop-aim` |
| Wind-up | 0.8s door open + 0.5s aim = 1.3s telegraph |
| Damage | per `pistol-pop-aim` event = 15 |
| Cease | implicit on-camera-leaves-dwell |

### Cover-pop

| Component | Value |
|---|---|
| Trigger | `on-arrive` at combat position |
| Spawn cue | `enemy-spawn` on a short rail behind a Wall/Pillar primitive |
| Archetype | `security-guard` or `hitman` |
| Fire program | `pistol-cover-pop` |
| Wind-up | 0.5s |
| Damage | 10 |
| Cease | after 3 loops, or on-clear |

### Vault-drop

| Component | Value |
|---|---|
| Trigger | `on-arrive` |
| Spawn cue | `enemy-spawn` on a rail starting *above* a cubicle wall and ending on the cubicle floor |
| Archetype | `middle-manager` (most common) |
| Fire program | `vault-drop-fire` |
| Wind-up | 1.0s silhouette + 0.5s descent |
| Damage | 15 |
| Cease | after 1 fire, or on-camera-leaves-dwell |

### Crawler

| Component | Value |
|---|---|
| Trigger | `on-arrive` |
| Spawn cue | `enemy-spawn` on a rail starting *below the floor plane* (vent/well) |
| Archetype | `middle-manager` |
| Fire program | `crawler-lunge` |
| Wind-up | 1.5s emergence |
| Damage | 20 (melee) |
| Cease | after melee resolves, or on-camera-leaves-dwell |

### Background-shamble

| Component | Value |
|---|---|
| Trigger | `wall-clock` (early — gives time to walk in) |
| Spawn cue | `enemy-spawn` on a long rail in deep background |
| Archetype | `middle-manager` |
| Fire program | `shamble-march` |
| Wind-up | 3.0s+ continuous walk |
| Damage | 15 (melee on arrive) |
| Cease | reaches end of rail, or on-camera-leaves-dwell |

### Charge

| Component | Value |
|---|---|
| Trigger | `on-arrive` |
| Spawn cue | `enemy-spawn` on a fast straight rail directly toward the camera |
| Archetype | `swat` typically |
| Fire program | `charge-sprint` |
| Wind-up | 2.0s acceleration |
| Damage | 30 (melee on arrive) — punisher |
| Cease | reaches end of rail, or on-clear (sibling enemies dead) |

### Vehicle-entry

| Component | Value |
|---|---|
| Trigger | `on-arrive` |
| Spawn cue | `prop-anim` on a vehicle Prop sliding along a rail; 2-3 `enemy-spawn`s on per-side dismount rails |
| Archetype | mix — typically 2 `hitman` + 1 `swat` |
| Fire program | `vehicle-dismount-burst` |
| Wind-up | 1.2s vehicle entry |
| Damage | 15 each |
| Cease | per-enemy default |

### Drive-by

| Component | Value |
|---|---|
| Trigger | `on-arrive` |
| Spawn cue | `enemy-spawn` on a fast traversal rail across the camera |
| Archetype | `hitman` ×2 |
| Fire program | `drive-by-volley` |
| Wind-up | 0.7s |
| Damage | 12 each |
| Cease | reaches end of rail |

### Rooftop-sniper

| Component | Value |
|---|---|
| Trigger | `on-arrive` |
| Spawn cue | `enemy-spawn` on a short vertical rail emerging from above |
| Archetype | `hitman` |
| Fire program | `sniper-aim` |
| Wind-up | 1.5s |
| Damage | 35 — punisher tier |
| Cease | on-clear, else camera-leaves |

### Lob

| Component | Value |
|---|---|
| Trigger | `on-arrive` (host beat already firing) |
| Spawn cue | none — uses an already-spawned enemy with `lob-throw` instead of pistol program |
| Archetype | shared with host beat |
| Fire program | `lob-throw` |
| Wind-up | 1.0s arc |
| Damage | 25 (or 0 if shot down mid-arc) |
| Cease | per host |

### Hostage

| Component | Value |
|---|---|
| Trigger | `on-arrive` |
| Spawn cue | `door` to `open`; `enemy-spawn` on the door's rail with `hostage-threat`; `civilian-spawn` on a paired rail |
| Archetype | `hitman` + `intern`/`consultant`/`executive` (paired civilian) |
| Fire program | `hostage-threat` (host) + `civilian-walk` (hostage) |
| Wind-up | 2.5s |
| Damage | 50 (host fires on player) + civilian-loss-on-fail = -500 score |
| Cease | enemy killed → both retreat; enemy fires → civilian dies; on-camera-leaves-dwell → both retreat |

### Civilian

| Component | Value |
|---|---|
| Trigger | `wall-clock` (entrance to position) |
| Spawn cue | `civilian-spawn` |
| Archetype | `intern` / `consultant` / `executive` (per-difficulty / per-level) |
| Fire program | `civilian-walk` |
| Wind-up | n/a |
| Damage | -500 score, -25 player HP, combo reset on player-hit |
| Cease | reaches end of rail |

### Justice-opportunity

A **layer** on a host beat — the host enemy's `pistol-pop-aim` or `pistol-cover-pop` is replaced with `justice-glint`. Player can shoot the weapon-hand for 200 score (vs 250 headshot) and the enemy raises hands and walks off (no kill credit toward combo).

### Mass-pop

| Component | Value |
|---|---|
| Trigger | `on-arrive` |
| Spawn cue | 5-8 `enemy-spawn`s on per-cover rails simultaneously |
| Archetype | mixed |
| Fire program | `mass-pop-volley` (synchronised across all spawns) |
| Wind-up | 1.0s synchronised |
| Damage | 10 each, cumulative |
| Cease | on-clear, after 1 volley |

### Boss-phase

Bosses are addressed via dedicated `boss-spawn` and `boss-phase` cues. Their fire programs are bespoke, defined in the boss's level doc (`07-executive-suites.md` for Crawford, `08-boardroom.md` for the Reaper, etc.). Each phase has its own fire-program tape; the director cuts to the next tape on HP threshold.

## Composition rules (for level authors)

Authoring rules to keep encounters fair and tonally coherent. Echoes `01-pacing-and-time-math.md`'s reticle-cap math.

1. **No more than 2 of the same beat type back-to-back** in a single combat position.
2. **At least one calm beat (`background-shamble` or `civilian`) per 3 high-pressure beats** for breathing room.
3. **Civilians at 1-of-4 positions on Normal** (scales per `03-difficulty-and-modifiers.md`).
4. **No civilians during mini-boss positions** — too much going on.
5. **`mass-pop-volley` max once per cubicle floor.** It's the climax beat.
6. **`charge-sprint` sparingly on stairway levels** (tilted camera makes Z-distance harder to read).
7. **`hostage-threat` max one per floor.**
8. **Always pair vertical-priority beats with horizontal beats** (sniper + crawler, vault + cover-pop) to force aim splits.
9. **Reticle-cap** — no more than 4 simultaneously-orange-or-red enemies on Normal (per `03-difficulty-and-modifiers.md` table).

## Weapon affinity

Two weapons in the loadout (pistol + rifle, swappable mid-position). Different beats favour different weapons — encourages using both.

| Beat | Best weapon class |
|---|---|
| door-burst, cover-pop, sniper, hostage, justice | pistol (precision, low spread) |
| crawler, charge, vehicle, drive-by, mass-pop | rifle (sustained, multi-target) |
| vault-drop | either (mid-air shot is the skill flex) |
| lob | pistol (precision shot of mid-air projectile) |
| civilian | NEVER FIRE |

## Future additions (not v1)

Reserved for post-release expansion (require new fire-program presets, new GLBs, or new construction primitives):

- `gas-leak` — area-of-effect environmental hazard
- `electrified-cubicle` — interactive trap surface
- `vending-machine-throw` — heavy enemy variant who throws a vending machine
- `sliding-door-trap` — door slides shut, traps player in cover until they shoot the lock
- `phone-call` — UI distraction, intercom rings, player must shoot the receiver to silence

These do not exist in v1 levels. v1 is the 16 patterns above + 4 mini-bosses + 1 final boss.
