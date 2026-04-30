---
title: Encounter Vocabulary
updated: 2026-04-30
status: current
domain: product
---

# Encounter Vocabulary

This is the canon list of encounter beats. Levels compose runs from these. Implementation maps each beat to a TypeScript handler in `src/encounter/beats/<beat-id>.ts`. Each beat has stable parameters and a clear runtime contract.

The 16 beats are research-derived from the genre lineage (Time Crisis, House of the Dead, Virtua Cop, Crisis Zone, Operation Wolf). See `.agent-state/rail-shooter-research.md` for the source-by-source breakdown.

## Beat data shape

```ts
interface Beat {
  id: BeatId;
  windupMs: number;        // green → orange transition
  commitMs: number;        // orange → red transition
  enemy: ArchetypeId;       // which enemy archetype emerges
  spawnLocation: BeatLocation;  // where the enemy comes from
  approachPath: ApproachPathId; // how the enemy moves once spawned
  weakpoint: WeakpointId;   // body-shot vs headshot vs justice-shot vs special
  damageOnPlayer: number;   // HP loss if the enemy completes their attack
  scoreOnKill: number;
}

type BeatId =
  | 'door-burst' | 'cover-pop' | 'vault-drop' | 'crawler'
  | 'background-shamble' | 'charge' | 'vehicle-entry' | 'drive-by'
  | 'rooftop-sniper' | 'lob' | 'hostage' | 'civilian'
  | 'crate-pop' | 'justice-opportunity' | 'mass-pop' | 'boss-phase';
```

Per-beat handlers spawn enemies, drive their approach paths, telegraph via the reticle, and report kill / damage / civilian-hit events to the score system.

## The 16 beats

### door-burst

A cubicle door swings or shatters open. The enemy emerges, turns to face the player, fires once, then either retreats or holds for a follow-up shot.

| Param | Default |
|---|---|
| Wind-up | 0.8s (door creaks → opens) |
| Commit | 0.4s (enemy aims) |
| Spawn | Cubicle door at side of rail |
| Approach | Step out of door, rotate to face player, fire |
| Weakpoint | Head (250 score) or body (100 score) |
| Damage | 15 HP |

**Best counter:** Headshot during the wind-up's "door open" frame (peak headshot bonus). Civilian-friendly: doors are visually distinct from open corridors, players can pre-aim.

**Authoring rule:** No more than 3 simultaneous door-bursts in a single position. Stagger by ≥0.3s.

### cover-pop

Enemy leans out from a fixed cover prop (cubicle wall edge, doorframe), fires a single shot, retreats. Repeats up to 3× per encounter unless killed.

| Param | Default |
|---|---|
| Wind-up | 0.5s |
| Commit | 0.3s |
| Spawn | Hidden behind cover; reveal on wind-up |
| Approach | Lean out, fire, lean back |
| Weakpoint | Head (peak score window: only ~0.6s exposed) |
| Damage | 10 HP |

**Best counter:** Pre-aim the lean point; fire during the orange window. Justice-shot (weapon hand) has a higher hit rate here than headshot.

**Authoring rule:** Cover-pops can chain (same enemy reappears from same cover). Limit to 3 chains before promoting to a different beat.

### vault-drop

Enemy vaults from above — over the top of a cubicle wall from the row behind. Player sees them airborne for 0.5s before they land and turn.

| Param | Default |
|---|---|
| Wind-up | 1.0s (silhouette appears above wall) |
| Commit | 0.5s (descent) |
| Spawn | Above and behind a cubicle wall in the foreground row |
| Approach | Vault → land → rotate → fire |
| Weakpoint | Head (mid-air shot = bonus +50%) |
| Damage | 15 HP |

**Best counter:** Mid-air headshot. Look up — the silhouette gives away the vault.

**Authoring rule:** Vault-drop announces the row behind has enemies. Use it to telegraph mass-pop one beat later.

### crawler

Enemy rises from below the screen — coming up from a stairwell well, a vent, or under a desk. Slow telegraph but close range.

| Param | Default |
|---|---|
| Wind-up | 1.5s (rising) |
| Commit | 0.8s (lunge) |
| Spawn | Below floor line of rail |
| Approach | Climb up, lunge for player's shins |
| Weakpoint | Head — but it's at low Y, requires aim down |
| Damage | 20 HP if lunge connects |

**Best counter:** Body shots — multiple — work because the enemy is moving slowly and predictably. Headshots demand low-aim discipline.

**Authoring rule:** Use crawlers to force the player's aim away from horizon. Pair with a high beat (rooftop-sniper) for a forced multi-axis priority.

### background-shamble

A slow walker emerges from far depth (50+ unit distance) and walks toward the rail. Cannon fodder — the calm beat in a cluster.

| Param | Default |
|---|---|
| Wind-up | 3.0s+ (continuous walking) |
| Commit | 1.0s (lunge into reach) |
| Spawn | Far end of corridor or visible depth |
| Approach | Slow continuous walk; reaches player ~5-8s after spawn |
| Weakpoint | Head (small target at distance — high skill bonus) |
| Damage | 15 HP if reaches player |

**Best counter:** Long-range headshots while still in the green-reticle phase. Reward early shooting with a precision bonus.

**Authoring rule:** Background-shambles establish corridor depth. Always have at least 1 per cubicle floor's first combat position.

### charge

Enemy sprints at full speed toward the camera. Ignores cover if not killed before contact (slams into the rail and damages player even mid-cover).

| Param | Default |
|---|---|
| Wind-up | 2.0s (visibly accelerating) |
| Commit | 0.6s (final sprint, can't be cover-blocked) |
| Spawn | Mid-distance (15-25 units) |
| Approach | Run directly at camera; doesn't deviate |
| Weakpoint | Head (one-shot stop) or body (requires 3+ hits) |
| Damage | 30 HP — this is the punisher beat |

**Best counter:** Single headshot. If you miss, sustained body fire to stop them. Don't go to cover — this enemy ignores it.

**Authoring rule:** Use charges sparingly (1-2 per cubicle floor). Pair with a distraction beat (cover-pop) to test the player's priority sense.

### vehicle-entry

A mail cart, hand truck, or office chair-on-wheels rolls into the rail, occupied by 2-3 enemies. They jump off both sides on arrival.

| Param | Default |
|---|---|
| Wind-up | 1.2s (vehicle enters) |
| Commit | 0.5s (enemies dismount) |
| Spawn | Vehicle enters from one end of rail |
| Approach | Vehicle stops; enemies leap off both sides; rotate to face player |
| Weakpoint | Per-enemy headshot |
| Damage | Per-enemy 15 HP |

**Best counter:** Sweep-fire across both sides during dismount. Rewards spray weapons.

**Authoring rule:** Multi-target swivel beat. Doesn't pair well with civilian beats (too chaotic). Limit to 1 per floor.

### drive-by

A cart passes through quickly with shooters firing one volley each. Enemies don't dismount — quick-draw window only.

| Param | Default |
|---|---|
| Wind-up | 0.7s (vehicle visible) |
| Commit | 0.4s (firing window) |
| Spawn | Vehicle enters at speed |
| Approach | Vehicle traverses rail; enemies fire as they pass |
| Weakpoint | Per-enemy head (small window) |
| Damage | Per-enemy 12 HP |

**Best counter:** Rapid follow-up shots. Encourages spray weapons.

**Authoring rule:** Drive-by punishes slow aim. Use as a difficulty-spike beat in mid-late levels.

### rooftop-sniper

Long-distance shooter pops up from above the cubicle line — at the top of a wall, on a balcony, on top of a filing cabinet column. Small target, big damage.

| Param | Default |
|---|---|
| Wind-up | 1.5s (silhouette emerges) |
| Commit | 0.6s (aim) |
| Spawn | Top of background environment |
| Approach | Stationary; aims at player; fires high-damage shot |
| Weakpoint | Head only (body shots require 3+) |
| Damage | 35 HP — punisher tier |

**Best counter:** Precision headshot during wind-up. Use a hitscan weapon (staple-rifle, fax-machine).

**Authoring rule:** Rooftop-snipers create vertical priority. Always pair with a low-aim beat (crawler, charge) so the player must split attention.

### lob

Enemy throws a stapler / coffee cup grenade in an arc. Player can shoot the projectile mid-flight to detonate harmlessly, or take cover during impact.

| Param | Default |
|---|---|
| Wind-up | 1.0s (arc trajectory drawn) |
| Commit | 0.5s (impact) |
| Spawn | Existing enemy throws projectile |
| Approach | Projectile follows arc to player position |
| Weakpoint | Projectile (small mid-air target) |
| Damage | 25 HP if impact lands |

**Best counter:** Shoot the projectile mid-arc — reward the precision shot. Else, cover.

**Authoring rule:** Lob is a forcing beat — it forces cover or a precision shot. Pair with a position-cleared moment so the player isn't simultaneously juggling 5 other threats.

### hostage

An enemy holds an office worker (intern / consultant / executive). The hostage walks/struggles — small movement window. Shoot the enemy, save the hostage. Miss, kill the hostage. Don't shoot, the enemy executes the hostage on commit.

| Param | Default |
|---|---|
| Wind-up | 2.5s (enemy holds, hostage struggles) |
| Commit | varies (knife / gun execution) |
| Spawn | Existing enemy emerges from door / cover with hostage |
| Approach | Stationary; threatens hostage |
| Weakpoint | Enemy head (precision-only — torso shot may hit hostage) |
| Damage | 50 HP + score loss if hostage dies (player's fault either way) |

**Best counter:** Precision headshot on the enemy. Justice-shot (disarm) also works — bonus score.

**Authoring rule:** Maximum one hostage beat per cubicle floor. Always uses a civilian asset for the hostage.

### civilian

Non-combatant office worker walks across the rail. The "do not shoot" beat. No telegraph (intentionally — the player has to identify the civilian on sight).

| Param | Default |
|---|---|
| Wind-up | 0s (no warning, just walks in) |
| Commit | n/a |
| Spawn | Side of rail |
| Approach | Walks across, exits opposite side |
| Weakpoint | NEVER SHOOT |
| Damage | -500 score, -25 HP, combo reset, audio sting |

**Best counter:** Don't shoot. The civilian walks off-screen on their own.

**Authoring rule:** Civilians appear in 1 of 4 positions on Normal (frequency scales with difficulty per `01-pacing-and-time-math.md`). The civilian's archetype is randomized per-run.

### crate-pop

A mineable cabinet, water cooler, filing box, or office chair is shootable. Drops currency / ammo / health when destroyed.

| Param | Default |
|---|---|
| Wind-up | n/a (always present in scene) |
| Commit | n/a |
| Spawn | Background dressing |
| Approach | Static |
| Weakpoint | Body — 2-3 shots to break |
| Damage | n/a (no damage to player) |

**Best counter:** Shoot when there's a beat lull. Risk/reward on ammo conservation.

**Authoring rule:** 2-4 crate-pop opportunities per cubicle floor. Most drop coffee or binder-clips; occasional drops a weapon-tier-up token.

### justice-opportunity

An enemy's weapon hand glints just before they fire — the disarm window. A precision shot to the hand disables the enemy without killing (they raise hands, walk off-screen). Bonus score, no kill credit toward combo.

| Param | Default |
|---|---|
| Wind-up | 0.3s glint |
| Commit | 0.3s — fires if not disarmed |
| Spawn | Layered onto another beat (cover-pop, door-burst) |
| Approach | Same as host beat |
| Weakpoint | Weapon-hand only (small target) |
| Damage | Same as host beat if not disarmed |

**Best counter:** Aim for the weapon hand. Score: 200 (vs 250 headshot). Skill flex.

**Authoring rule:** Justice-opportunity layers onto existing beats. Doesn't increase encounter count — it's a scoring tier on existing enemies.

### mass-pop

5-8 cover-pops simultaneously. The "screen-clear" beat. Spray-weapon shines; precision-weapon player has to prioritize hard.

| Param | Default |
|---|---|
| Wind-up | 1.0s (synchronized) |
| Commit | 0.4s |
| Spawn | All from cover positions across the field of view |
| Approach | Lean out simultaneously; fire as a group |
| Weakpoint | Per-enemy head |
| Damage | Per-enemy 10 HP — but cumulative if multiple commit |

**Best counter:** Sweep across with sustained fire. Use SMG / shotgun. Be in cover before commit.

**Authoring rule:** One mass-pop per cubicle floor maximum. It's the climax beat. Pair with a guaranteed weapon-pickup nearby (player should have ammo for it).

### boss-phase

Composite beat for boss fights. Each phase fires a sequence of "internal beats" specific to that boss, plus a phase-change visual on transition.

| Param | Default |
|---|---|
| Wind-up | per-boss |
| Commit | per-boss |
| Spawn | Boss is already on screen |
| Approach | Per-boss attack patterns |
| Weakpoint | Body / weakpoint-glow / phase-specific |
| Damage | Per-boss attack |

**Best counter:** Per-boss; specified in the level doc.

**Authoring rule:** Mini-boss = 2 phases (50% HP threshold). Final boss = 3 phases.

## Beat composition rules (recapping `01-pacing-and-time-math.md`)

These authoring rules apply when chaining beats into a combat position:

1. **No more than 2 of the same beat type back-to-back** in a single position.
2. **At least one calm beat (background-shamble or crate-pop) per 3 high-pressure beats** for breathing room.
3. **Civilians at 1-of-4 positions on Normal** (scales with difficulty per pacing doc).
4. **No civilians during mini-boss positions** — too much going on.
5. **Mass-pop max once per cubicle floor.**
6. **Charge beats sparingly on stairway levels** (tilted camera makes Z-distance hard).
7. **Hostage max one per floor.**
8. **Always pair vertical-priority beats with horizontal beats** (rooftop + crawler, vault + cover-pop) to force aim splits.

## Weapon affinity per beat

Different weapons feel right for different beats:

| Beat | Best weapon class |
|---|---|
| door-burst | hitscan (precision) |
| cover-pop | hitscan (precision) |
| vault-drop | hitscan or projectile (mid-air shots) |
| crawler | spray (sustained body damage) |
| background-shamble | hitscan (long-range precision) |
| charge | spray (sustained stopping power) or hitscan headshot |
| vehicle-entry | spray (multi-target) |
| drive-by | spray (rapid follow-up) |
| rooftop-sniper | hitscan (precision) |
| lob | hitscan (mid-air projectile) |
| hostage | hitscan (precision) |
| civilian | DO NOT SHOOT |
| crate-pop | any |
| justice-opportunity | hitscan (small target) |
| mass-pop | spray (sustained sweep) |
| boss-phase | per-boss |

This drives loadout decisions: a player going hitscan-only has a harder time on charges and mass-pops, and vice versa. Encourages using both weapon slots.

## Future beat additions (not v1)

Reserved for post-release expansion:

- `gas-leak` — area-of-effect environmental hazard
- `electrified-cubicle` — interactive trap surface
- `vending-machine-throw` — heavy enemy variant who throws a vending machine
- `sliding-door-trap` — door slides shut, traps player in cover until they shoot the lock
- `phone-call` — UI distraction, intercom rings, player must shoot the receiver to silence

Adding any of these post-v1 should start by extending the beat handler library and authoring 2-3 levels' worth of new placements before locking the design.
