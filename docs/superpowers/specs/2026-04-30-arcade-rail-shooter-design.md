---
title: Arcade Rail Shooter Design
updated: 2026-04-30
status: current
domain: product
supersedes:
  - 2026-04-30-doom-grid-pivot-design.md
  - 2026-04-30-weapon-progression-design.md (partial)
---

# Arcade Rail Shooter Design

> DORD pivots from voxel-FPS to **arcade rail shooter** in the lineage of Time Crisis, House of the Dead, and Virtua Cop. Research input: `.agent-state/rail-shooter-research.md`. Mobile-first single-thumb input. Player has no movement controls. Rail moves at length-determined speed through a sequence of combat positions where the player aims, fires, dodges (cover), and reloads. The maze, the chunks, the navmesh, the player kinematic, and most of yuka all retire.

## Goal

Ship a focused arcade rail shooter that exploits the asset library we already curated (6 weapons, FPS hands, 4 enemy archetypes, 1 boss, 240 retro door/wall textures, 66 audio files) and the brand the spec already commits to (office comedy-horror, Departure Mono UI, intercom-page narrator, threat-tier ambience). The OOM crash on 2026-04-30 confirmed we built too much engine for the game we needed; this spec rebuilds on the appropriate engine.

## What this game is

DORD is a coin-op cabinet experience in your pocket. The player puts in a "shift" at the office (5 to 60 minutes, player's choice). The rail moves them past cubicles in first-person. Enemies emerge from spawn-closet doors and corridor turns. The player aims with a finger, fires by tapping, ducks behind cover by releasing, and survives or doesn't. Score, combo, headshot multipliers, daily-challenge seed. End the run, see the score table, insert another coin (start another mission).

## Core verbs (5)

| Verb | Mobile input | Desktop input |
|---|---|---|
| Aim | Drag finger anywhere on screen → crosshair follows | Mouse |
| Fire | Tap | Click |
| Reload | Tap reload button (or aim off-screen + tap) | R, or shoot off-screen |
| Cover (expose/hide) | Tap-and-hold cover button = exposed; release = covered | Hold space |
| Weapon swap | Tap weapon icon (cycles owned) or tap-and-hold for radial | 1/2/3 number keys |

That's the entire input surface. No virtual joystick, no movement, no path-finding, no spatial puzzle. Single thumb on mobile in landscape orientation; left thumb optionally for cover button. Aim takes precedence; everything else is secondary affordance.

## What's deleted from prior work

| System | Reason |
|---|---|
| Voxel chunks (`src/world/chunk/`, `Chunk.tsx`, `ChunkData.ts`, `greedyMesh.ts`) | No voxels |
| Floor swap, stairwells, transitions (`src/world/floor/`, `src/render/stairwells/`) | One mission, no floors |
| Maze generator, biome flood-fill, RailNode graph in the topological sense | Rail is a polyline, not a graph |
| `PlayerKinematic`, Rapier capsule collider for player | No movement |
| Tap-to-walk, navmesh path-find for player | No movement |
| yuka `NavMesh.fromPolygons`, yuka Vehicle/SteeringBehaviors | Enemies on rails or hand-authored approach paths |
| `useFloorState`, `floorRouter`, door-tap routing | No floors, no door routing |
| Fall damage | No falling |
| Mining via radial menu | Replaced with "shoot mineable cabinets" — pure shooting |
| Place-structure radial menu | Out of scope for v1; bring back as bonus stage if ever |
| `Workbench` per 5th floor | Becomes between-mission upgrade screen on the cabinet menu |
| Weapon-pickup as walk-over collide | Becomes "shoot the airborne weapon icon" — arcade-canon |
| Most of the per-floor procedural variation | Mission-length presets drive content; seed picks specific encounters |

## What survives unchanged or lightly adapted

| System | Adaptation |
|---|---|
| Six-weapon roster + tier system (committed Tasks 1-3, weapon-progression branch) | Kept entirely. Tiers persist within a run; reset on new run. |
| Weapon GLBs (`weapon-ak47`, etc.) | Mounted as FPS viewmodels |
| FPS hands GLB | Always-visible viewmodel; weapon swaps under the same hands |
| 4 enemy archetypes + Reaper boss + per-archetype GLBs | Reused as encounter spawn types |
| Audio library (ambience layers, weapon fires, impact, UI, stinger) | Per-biome ambience swap on rail-segment crossings; stingers at scene-clear |
| Capacitor 8 + safe-area + i18n | Unchanged |
| drizzle/SQLite save | Schema simplifies: `{ missionLength, seed, position, hp, score, weaponsUnlocked, dailyClearedAt }` |
| Pause menu, GameOver, landing | Unchanged structurally; landing gets the mission-length selector |
| Score and high-score tables | New (was implicit before) |
| Currency wallet | Reframed: "shells" / coins for between-mission upgrades, persisted across runs |
| `WeaponPickup` R3F | Adapted: pickups appear as airborne icons during scenes; shoot to collect |
| WorkbenchPanel | Reframed: "Locker Room" between-mission UI on the cabinet shell |

## Rail structure

The rail is a polyline in 3D space. Each polyline vertex is either a **traversal point** (rail just moves through) or a **combat position** (rail STOPS and a scene fires). The camera interpolates along the polyline at fixed speed between positions.

```
spawn → [traverse] → COMBAT_POS_1 → [traverse] → COMBAT_POS_2 → … → BOSS_ARENA
```

At combat positions:
- Rail freezes
- "Scene" begins — a sequence of timed encounter beats
- Player is automatically in cover (camera dipped behind cubicle wall)
- Player taps cover button to peek up and engage
- Scene ends when all enemies cleared (or timer expires for hard mode)
- Rail resumes to next position

Between combat positions:
- Rail moves at the mission's calibrated speed
- Camera glides forward, slight head-bob
- Background scenery (cubicles, posters, water coolers, mining-targets) flies past
- Enemies CAN appear during traversal (vehicle-style drive-bys, brief windows of opportunity for headshots)
- Pickup icons fly past — shoot them to grab

Rail visual: cubicle walls flank the rail at chest height (1.6u) with floor below and ceiling above. Doors set into cubicle walls at intervals. The rail itself is invisible — players see a corridor; the camera does the moving.

## Encounter beats (vocabulary)

Each beat is a small, hand-authorable, timed event. Combat positions chain 1-5 beats in sequence. Beats are taken from the genre research; names are stable so spec / authoring / tests share vocabulary.

| Beat ID | Description | Counters |
|---|---|---|
| `door-burst` | Cubicle door swings/shatters open; enemy emerges, turns, fires | Headshot during emergence; cover during volley |
| `cover-pop` | Enemy leans out from a cubicle wall, fires, retreats | Time the peek; precision shot |
| `vault-drop` | Enemy vaults the cubicle wall from the row behind | Look up; headshot |
| `crawler` | Enemy crawls on hands/knees from below screen edge | Aim down; multiple body shots |
| `background-shamble` | Slow walker emerges from far depth, walks into engagement range | Free pick; ammo conservation |
| `charge` | Enemy sprints toward camera; ignores cover if not killed | Stop with sustained fire or single headshot |
| `vehicle-entry` | A mail cart / hand truck rolls in, enemies leap off both sides | Multi-target swivel |
| `drive-by` | Enemy on a passing cart fires a burst, exits | Quick-draw window |
| `rooftop` | Sniper on cubicle-top fires a long-range shot | Small target, big damage if missed |
| `lob` | Enemy throws a stapler / coffee cup grenade in arc | Shoot midair OR cover |
| `hostage` | Enemy holds an office worker; precision shot saves them, miss kills them | Justice-shot |
| `civilian` | Office worker walks through scene; friendly fire = penalty | Don't shoot |
| `crate-pop` | Mineable cabinet visible; shoot to break, drops currency or ammo | Optional; uses ammo |
| `justice-opportunity` | Enemy weapon-hand glints; precision disarm = bonus, no kill | High-skill option |
| `mass-pop` | 5-8 enemies pop simultaneously from cover | Spray weapon shines; combo target |
| `boss-phase` | Multi-phase boss with body-part weakpoint | Pattern recognition |

Each combat position is authored as `{ position: railIndex, beats: BeatId[] }`. Authors hand-write 30-60 scene templates over the project lifetime. The mission generator chains scenes to hit target time.

## Three-state color reticle (genre primitive)

Every visible enemy carries a small box around them, color-coded:

- **Green** — enemy spotted, no immediate threat (idle, walking in)
- **Orange** — enemy is winding up to fire (~0.6 sec warning)
- **Red** — incoming hit imminent; kill them THIS frame or take damage

This is THE encounter-pacing UI element. It survives perfectly on a small screen, telegraphs every beat, and trains player priority instantly. Color-blind mode swaps to icon shapes (◯ → △ → ✕). The reticle is a **first-class HUD layer**, mounted at fragment-shader depth on each enemy in screen space.

## Cover mechanic

The Time Crisis pedal does not survive mobile. The replacement is **proximity-triggered auto-cover** at combat positions.

- At a combat position, the camera dips behind the cubicle wall on the right side (default; left if right-handed-mode disabled)
- A "Cover" button appears in the bottom-left thumb area
- **Hold cover button** → camera lowers, can't fire, can't be hit
- **Release** → camera rises into firing position, can fire, vulnerable
- Default state on combat-position entry = covered (button released)
- Spray weapons (incinerator, expense-report-smg) support **tap-and-hold cover button + drag** for "lean out and sustained fire"
- Reload while covered is faster than reload while exposed (encourages duck-to-reload rhythm)

The cover dynamic IS the difficulty curve: low-tier enemies have generous orange→red reticle windows so players can pop, fire, drop. High-tier enemies (swat squads, hitman snipers) shrink the windows; mass-pop beats force tactical sequencing.

## Adaptive difficulty (Razing Storm pattern)

Within a single combat position, a hitless streak shrinks the reticle warning windows. Take damage = reset to default windows. This makes good play feel tight and forgiving play feel humane. All software, no asset cost.

```
warning_ms = base_ms × max(0.5, 1 - 0.05 × hitless_kills_in_section)
```

Floor at 50% — never zero, players still get a fair telegraph at peak streak.

## Civilian discipline

Office workers walk through scenes:
- **Intern** — small, fast, screams visibly when shot, BIG penalty
- **Consultant** — neutral, walks across rail, medium penalty
- **Executive** — comically slow, holds briefcase, high penalty
- **Briefcase carrier** — drops shells (currency) on death, but it's still murder

Hit penalties:
- HP loss equal to enemy damage (don't undermine the threat layer)
- Combo streak resets to zero
- Score loss (-500 typical)
- Audio sting + screen flash
- HUD popup with personalized line ("YOU SHOT THE INTERN", "RUTH WAS SOMEONE'S DAUGHTER")

Civilians appear at calibrated density: roughly one per scene at standard difficulty. They are the genre's primary skill discriminator and DORD's primary comedy beat.

## Justice shot

Shooting an enemy's weapon-hand (small hitbox, glints just before they fire) disarms them without killing — they raise hands, walk off-screen. Score bonus equal to a headshot, no kill credit toward combo. Adds a high-skill scoring tier above headshot. Optional path; can always just kill them.

## Boss fights

End of each biome, the rail enters a boss arena. Rail stops. Camera locks to a slow arc around the boss. The boss has 3-5 phases gated by HP thresholds; each phase has a named attack pattern (e.g. Reaper: REDACT volley → TELEPORT shadow → SUBPOENA charge). Each phase exposes a weakpoint (head, briefcase, name-tag) for bonus damage. Boss death = mission-clear stinger + biome-clear rewards.

Bosses ride the same encounter-beat vocabulary internally — phase 1 is "boss-phase" with a charge beat, phase 2 layers in mass-pop, etc.

## Mission length presets

Player picks one on the landing screen. Default to Standard. Persisted via `@capacitor/preferences`.

| Preset | Target time | Combat positions | Biomes | Bosses | Combat-position density |
|---|---|---|---|---|---|
| Sprint | 5 min | 8-10 | 2 | 1 | high — back-loaded |
| Short | 10 min | 18-22 | 3 | 2 | mid |
| Standard | 15 min | 30-35 | 4 | 3 | mid |
| Extended | 30 min | 60-70 | 5 | 4 | mid (varied per biome) |
| Marathon | 60 min | 120-140 | 6 | 5 | spread; one slow biome |

Calibrator math:

```
target_seconds = scene_count × avg_scene_seconds + traversal_time + boss_time

avg_scene_seconds = 18      // 3 beats × 6 sec/beat avg
traversal_time = scene_count × 2.5  // glide between positions
boss_time = boss_count × 90
```

Solving Sprint = 300s:
```
300 = N × 18 + N × 2.5 + 90  (1 boss)
210 = N × 20.5
N ≈ 10.2 combat positions
```

Marathon = 3600s:
```
3600 = N × 20.5 + 5 × 90
3150 = N × 20.5
N ≈ 153 combat positions  → split into 6 biomes of ~25 each
```

These reduce naturally to the table above. Tuning constants live in `src/rail/calibrate.ts`.

## Biome chain

Biomes are rail segments with their own visual + audio identity. Five canonical biomes (the Standard preset visits 4):

| Biome | Walls | Door style | Enemy pool | Ambience layer | Boss |
|---|---|---|---|---|---|
| Lobby | drywall | wood | manager (sparse) | managers-only | — |
| Open Plan | cubicle-tile | yellow paint | manager + policeman | radio-chatter | Mid-Manager |
| HR Corridor | cubicle-tile darker | blue paint | policeman + hitman | boots-thump | Department Head |
| Executive Suites | laminate + wood | red paint | hitman + swat | tense-drone | Director |
| Server Room | metal + glass-brick | rusty metal | swat squads | tense-drone (intensified) | Reaper |

Biome boundary = rail crossing through a "transition arch" door. Visual fade for ~1 second; ambience layer crossfade; threat-tier color shift in HUD.

## Score model

Per-shot:
- Body shot kill: 100
- Headshot kill: 250 (+ headshot streak multiplier)
- Justice shot (disarm): 200 (no kill credit)
- Civilian hit: -500
- Missed shot: -10 (encourages deliberation, very small)

Combo:
- Streak counter increments on hit
- Resets on miss, civilian-hit, or damage taken
- Multiplier applied to all kills: `1.0 + 0.05 × min(combo, 30)` → caps at 2.5x

Scene clear:
- All enemies down: +500
- Hitless: +1500 (huge bonus, stack with combo)
- Time bonus: 100 × max(0, 30 - seconds_in_scene)

Mission clear:
- Boss-down: +5000
- Mission-clear stinger: +2000 + length-mult
- Length multiplier: Sprint 1.0× / Short 1.5× / Standard 2.0× / Extended 3.0× / Marathon 5.0×

Daily-challenge: same seed for everyone today. Leaderboard per length per day.

## Cabinet shell UI

Landing/main menu structurally a cabinet:

```
   ┌─────────────────────────────────────────┐
   │   DEPARTMENT OF                         │
   │   REDUNDANCY DEPARTMENT                 │
   │   ─────────────────────                 │
   │                                         │
   │      MISSION LENGTH                     │
   │      ┌────────────────────┐             │
   │      │  ⏱ Standard ▼     │             │
   │      └────────────────────┘             │
   │                                         │
   │         [ CLOCK IN ]                    │
   │                                         │
   │   ─────────────────────                 │
   │   TODAY'S DAILY (seed shown)            │
   │   YOUR BEST: 47,200                     │
   │   GLOBAL BEST: 72,150                   │
   │                                         │
   │   [LOCKER ROOM] [HIGH SCORES] [ABOUT]   │
   └─────────────────────────────────────────┘
```

- **CLOCK IN** — start a run with the chosen length
- **Mission length selector** — Radix Select; persists last-chosen
- **Daily** — today's seed at Standard length; one-attempt-per-day badge
- **Locker Room** — between-mission upgrade screen (currency spend)
- **High Scores** — per-length tables, daily leaderboard
- **About** — credits, license, sources

In-run UI is minimalist: HP bar (top-left), ammo+weapon (bottom-left), score+combo (top-right), reticle dead-center on aim point, cover button bottom-left thumb area.

## Persistence (drizzle schema)

Run-scoped (cleared at run end):
- `currentMission: { length, seed, position: railIndex, hp, score, combo, weaponsOwned: { slug, tier, ammo }[] }`

Persistent (across runs):
- `personalBest: { length: { score, time, date } }[]`
- `dailyAttempts: { date, score, time }[]`
- `weaponsEverUsed: Set<slug>` (cosmetic gallery)
- `shells: number` (currency wallet, persists)
- `unlockedWeapons: Set<slug>` (some weapons gated behind score thresholds)

Save migration: existing alpha saves with `currentFloor` are zeroed (one-time reset notice in patch notes).

## Asset reuse

Every curated asset has a clear v1 home:

| Asset | Used for |
|---|---|
| FPS hands GLB | Always-visible viewmodel |
| 6 weapon GLBs | Player viewmodels, equipped via `viewmodel-grips.json` |
| 4 enemy GLBs | Encounter beat enemies, instanced per scene |
| Reaper GLB | Final boss |
| 50 trap GLBs | Set dressing in cubicles, mineable cabinets, spawn-closet doors animated |
| 240 retro door PNGs | Spawn-closet doors per biome (one set per biome) |
| 240 retro window/shutter PNGs | Cubicle wall variety per biome |
| 66 audio files | Ambience per biome, weapon fires, impacts, UI cues, stingers |
| `viewmodel-grips.json` | Per-weapon scale/rotation for viewmodel mount |

We need additional assets only for: civilian "office worker" GLBs (3 archetypes — intern, consultant, exec); a transition arch door GLB. Both are simple props, low-poly, cheap to author.

## Architecture sketch

```
src/
  rail/
    rail.ts                    // polyline + interpolation; player camera follows
    rail.test.ts
    calibrate.ts               // mission length → rail length + scene count
    calibrate.test.ts
    generator.ts               // chains scene templates to fill rail
    generator.test.ts
  scene/
    types.ts                   // Beat, SceneTemplate
    library.ts                 // 30-60 hand-authored scene templates
    library.test.ts
    runtime.ts                 // executes a scene at a combat position
    runtime.test.ts
  reticle/
    Reticle.tsx                // R3F billboard per enemy
    state.ts                   // green/orange/red state machine
    state.test.ts
  cover/
    cover.ts                   // exposed/covered state
    cover.test.ts
  combat/
    (existing useFrameWeaponTick keeps; reads from rail position rather than auto-engage)
  civilian/
    Civilian.tsx               // R3F mount + hit penalty
    types.ts
  score/
    score.ts                   // per-shot + combo + scene + mission
    score.test.ts
  encounter/
    beats/
      door-burst.ts            // one file per beat type
      cover-pop.ts
      ...                      // 16 beat types
      index.ts
app/
  views/
    Game.tsx                   // rewritten — rail-driven, no movement
    Cabinet.tsx                // landing replaces with cabinet shell
    LockerRoom.tsx             // between-mission upgrade
    HighScores.tsx
```

R3F mount tree (in-run):

```
<Canvas>
  <RailCamera />              // moves the camera along the rail
  <Lighting />
  <Suspense fallback={null}>
    <BiomeFloor segment={...} />
    <BiomeCeiling segment={...} />
    <BiomeWalls segment={...} />
    <RailDressing segment={...} />   // posters, water coolers, mineable cabinets
    <SpawnClosetDoors segment={...} />
    {scene && <SceneRuntime scene={scene} onClear={...} />}
    <FpsViewmodel weapon={...} hands={...} />
    {civilians.map(c => <Civilian {...c} />)}
    {enemies.map(e => <RailEnemy {...e} />)}
    <PickupIcons items={...} />
  </Suspense>
</Canvas>
<HUD />
<Reticle3D />                  // overlays enemies in screen space
<CoverButton />
<ReloadButton />
<WeaponHotbar />
```

`<RailEnemy>` is the simplified enemy mount — no yuka NavMesh, no Vehicle. State machine with named approach paths per beat type. AI is encounter-script-driven, not autonomous.

## Phasing

This is a pivot, not a 21-task plan. Decompose into thin vertical slices, each shippable and playable.

**Phase 1 — Rail + camera + one weapon + one enemy + one beat type** (foundational; ~1 week of work)
- `<RailCamera>` glides through a hand-authored test rail
- One scene with one `door-burst` beat
- One enemy archetype (manager) emerges, stands, fires
- Player aims, fires `staple-rifle`, kills enemy, scene clears, rail resumes
- HP, ammo, reload all working
- Validates the core verb loop end-to-end

**Phase 2 — Cover + reticle + 5 beat types** (~1 week)
- Cover button + auto-cover at combat positions
- Three-state reticle on every enemy
- 5 beat types: door-burst, cover-pop, vault-drop, charge, civilian
- Civilian penalty + score popup
- Single biome, single mission length (Sprint)

**Phase 3 — Scoring + combo + cabinet shell** (~1 week)
- Per-shot scoring + combo multiplier
- Score HUD
- Mission-end score screen
- Landing rebuilt as cabinet shell with mission length selector
- High-score table (per length, local)

**Phase 4 — Five biomes + boss** (~2 weeks)
- All 5 biomes with biome-distinct walls/doors/ambience
- Mission generator chains scenes across biomes
- One boss (Reaper)
- All 4 enemy archetypes, all assigned to biome-appropriate scenes
- All 16 beat types implemented and tested
- All 5 mission length presets

**Phase 5 — Polish** (ongoing)
- Justice shot
- Adaptive difficulty
- Daily challenge
- Locker Room (between-mission upgrades)
- More scene templates
- Civilian voice lines + visual variety
- Branch nodes (HotD-style: shoot the right object during a scene to take a shorter rail)

## Out of scope

- Multiplayer / co-op
- Custom-length sliders (only the 5 presets)
- Procedurally generated boss patterns
- Maze / free-roam / movement of any kind
- Voxel anything
- Persistent run-to-run power creep (tier upgrades reset per run)
- Open-world stages
- Vertical maze (multi-story)

## Risks + mitigations

- **Genre lock-in.** Rail shooters are a niche genre on mobile. Mitigation: the cabinet aesthetic + comedy tone differentiate; daily challenge + leaderboards drive return play.
- **No-movement controls feel constraining.** Mitigation: the genre's lineage proves this is the strength, not the weakness; players who want walking sims can play Half-Life. Communicate clearly in onboarding ("This is a rail shooter — focus on aiming.").
- **Too much existing code to delete cleanly.** Mitigation: phase the deletion alongside the build. Phase 1 delivers a playable vertical slice on the new architecture; old code stays inert in the tree until Phase 5 consolidation.
- **Memory regression from per-scene asset loading.** Mitigation: lessons from the OOM crash apply — every R3F mount now ships with an explicit dispose useEffect; the Phase 1 work establishes the dispose discipline as a pattern.
- **Civilians break the joke.** "Don't shoot the intern" being central to gameplay risks landing flat. Mitigation: the visual and audio polish is non-trivial — invest in the comedy beat early (Phase 2) and validate it in playtests before locking score weights.

## Success criteria

A run feels like:

- 90 seconds in, the player has died once, restarted, and is leaning in
- They headshot a manager mid-`door-burst` and the combo counter jumps with a satisfying chunk
- They miss the cover button on a mass-pop and lose half their HP — feels fair
- They shoot an intern on accident and laugh
- They reach the boss and lose, but their score is up; they tap "ANOTHER COIN"
- They check the daily leaderboard and see they're 47th globally
- Total session: 8 minutes, 2 attempts, want to come back

The metric is not minutes-per-session; it's **sessions-per-week**. Cabinet game success = repeat coin-drops, not single-session length.
