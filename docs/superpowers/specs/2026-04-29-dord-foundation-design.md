---
title: Department of Redundancy Department — Foundation Design
status: APPROVED-FOR-PLANNING
date: 2026-04-29
authors: [jbogaty, claude-opus-4-7]
supersedes: []
---

# Department of Redundancy Department — Foundation Design

> **Tagline.** *"There has been a reorganization."*
>
> **One-line pitch.** A first-person voxel-prop FPS set inside an infinite procedurally generated corporate office. **DOOM meets Minecraft, in cubicles.** Persistent world. No runs. Build, mine, fight, descend.

This document is the canonical foundation spec for the alpha. All implementation PRQs trace back to a section here. Sections are gated by the user; each was approved before being written down.

---

## 0. Creative direction

**Setting.** You wake up at desk 0,0,0 with a stapler. Floor 1 of an infinite office tower. Every floor is procedurally generated. There is no lobby. There is no exit. There is only the next floor.

**Tonal pillars.**
1. **Industrial corporate dread, not horror.** Fluorescent buzz, server fans, dot-matrix screech, intercom pages. Tension comes from procedure violations and the slow rise of the **Threat** meter.
2. **Dignified blockiness.** Voxel-prop characters look like *people* (suits, ties, ID lanyards) — never Minecraft Steves. Hop-walk locomotion (LEGO minifig style) sells movement without rigging.
3. **Material honesty.** Real PolyHaven textures on the static voxel surfaces — carpet, ceiling tile, laminate, drywall. Voxel-prop characters and weapons stay flat-shaded against the grounded environment. That contrast *is* the look.
4. **Lighting that works.** Indoor warehouse/office HDRI for IBL ambient, one rectArea ceiling fixture per cubicle bank, one warm desk lamp per occupied cubicle, ACESFilmic tonemap, exposure ~1.0, sRGB out. **No fog.** Chunk culling gates draw distance.

**The "DOOM" surface.**
- Movement: drag-look + tap-to-travel (mobile-first). No ADS, no sprint, no crouch, no jump key.
- Weapons (alpha set): **Stapler** (melee), **Letter Opener** (fast melee), **Three-Hole Punch** (3-round burst), **Toner Cannon** (shotgun spread), **Fax Machine** (rocket arc), **Whiteboard Marker** (mark target → temporary speed buff).
- Pickups: binder clips (ammo), coffee (heal), donuts (overheal), briefcase (armor).

**The "Minecraft" surface.**
- Tap-and-hold any surface → **radial action menu** with context-appropriate options (place/mine/reinforce/etc).
- Every world block is mineable. Every placed block is destructible.
- Build defensive cubicle walls. Place desks, terminals, **stairs** (the Staircase1/2 GLBs serve as the buildable stair primitive). Mine through the floor to drop into the next sector.

**Persistence.** SQLite via drizzle (web: sql.js + jeep-sqlite; native: capacitor-community/sqlite). Only modified chunks are stored; pristine chunks regenerate from seed. Settings via `@capacitor/preferences`.

**Typography & color tokens.** See §11 Brand.

---

## 1. Repo + module layout

```
DOoRD/
├── CLAUDE.md
├── AGENTS.md
├── README.md
├── biome.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── capacitor.config.ts
├── drizzle.config.ts
├── package.json                     # pnpm 10
├── pnpm-lock.yaml
├── .agent-state/
│   ├── directive.md                 # ordered PRQ work queue
│   ├── digest.md
│   ├── cursor.md
│   └── decisions.ndjson
├── .claude/
│   ├── settings.json
│   └── gates.json
├── docs/
│   ├── DESIGN.md                    # short pointer to this spec
│   ├── ARCHITECTURE.md
│   ├── STATE.md
│   ├── ROADMAP.md
│   ├── TESTING.md
│   ├── LORE.md
│   ├── brand/{identity,typography,design-tokens}.md
│   ├── architecture/{overview,rendering,ai-pathfinding,voxel-pipeline,persistence,performance}.md
│   ├── game-design/{core-loop,weapons,enemies,building,stairwells,progression,threat-system}.md
│   ├── ui-ux/{controls,hud-layout,landing,radial-menu}.md
│   ├── plans/                       # one PRQ per file, prq-NN-<slug>.md
│   └── superpowers/specs/
│       └── 2026-04-29-dord-foundation-design.md   # this file
├── public/
│   ├── assets/
│   │   ├── hdri/                    # PolyHaven .hdr (indoor warehouse/office)
│   │   ├── textures/                # PolyHaven carpet/ceiling/laminate/etc
│   │   ├── models/{characters,props,traps}/   # GLBs (output of asset script)
│   │   ├── audio/
│   │   └── fonts/
│   ├── content/
│   │   ├── recipes.json
│   │   ├── narrator-grammar.json
│   │   └── memos.json
│   └── wasm/                        # sql.js + rapier wasm
├── app/
│   ├── main.tsx
│   ├── index.html
│   ├── App.tsx
│   ├── views/{Landing,Game,EmployeeFile,PauseMenu,GameOver}.tsx
│   └── shell/                       # framer-motion page transitions
├── src/
│   ├── render/
│   │   ├── world/                   # <World/>, <ChunkLayer/>, instanced block meshes
│   │   ├── lighting/                # HDRI env, RectAreaLights, desk lamps, ACES
│   │   ├── characters/              # <Character slug="..."/> + hop-walk locomotion
│   │   ├── weapons/                 # weapon HUD-icon + projectile spawn
│   │   ├── effects/                 # hit particles, paper-shred, dissolve-death
│   │   └── stairwells/              # Up-Door / Down-Door + fade-cut transition
│   ├── world/
│   │   ├── chunk/                   # ChunkData (Uint16Array), greedy mesh, per-chunk BVH
│   │   ├── blocks/                  # BlockRegistry, tilesets, face UVs, tool-affinity
│   │   ├── generator/               # seeded floor generator (cubicle banks, hallways, doors)
│   │   └── persistence/             # dirty-chunk diff + save/load
│   ├── ai/
│   │   ├── core/                    # yuka EntityManager bridge, tick driver
│   │   ├── navmesh/                 # navmesh build (worker), regen on chunk dirty
│   │   ├── enemies/                 # FSMs per archetype
│   │   ├── perception/              # vision cones, LOS via BVH, MemoryRecord
│   │   └── steering/                # presets: avoid + follow-path + flee + interpose
│   ├── combat/
│   │   ├── weapons.ts
│   │   ├── projectiles.ts
│   │   └── damage.ts
│   ├── building/
│   │   ├── place.ts
│   │   ├── mine.ts
│   │   └── stairs.ts
│   ├── ecs/                         # koota world + components + queries
│   ├── input/                       # tap-to-travel, drag-look, tap-hold radial, desktop fallback
│   ├── ui/
│   │   ├── tokens/
│   │   ├── primitives/              # radix wrappers + framer-motion variants
│   │   ├── chrome/                  # HUD overlays
│   │   ├── radial/                  # tap-and-hold radial action menu
│   │   └── world-ui/                # in-world Troika text
│   ├── audio/
│   ├── db/
│   │   ├── schema/
│   │   ├── migrations/
│   │   ├── client.ts                # web/native adapter
│   │   ├── repos/
│   │   └── preferences.ts
│   ├── content/                     # typed loaders for /public/content/*.json
│   ├── shared/utils/
│   ├── test/
│   └── verify/                      # debug overlays (navmesh viz, BVH viz, FPS, draw-calls)
├── e2e/                             # playwright golden-path
├── android/                         # Capacitor android shell
├── ios/                             # Capacitor ios shell
├── references/                      # gitignored; raw asset packs (DAE/GLTF/OBJ/PNG)
└── scripts/
    ├── convert-references.py        # bpy: clean → import → bake (DAE) → decimate → export GLB
    ├── convert-references.config.json
    ├── check-asset-manifest.mjs
    ├── fetch-polyhaven.mjs
    └── README.md
```

**Import convention.**
- `app/` may import from `src/*` and `app/*`.
- `src/` is engine; never imports from `app/`.
- Static data (textures/HDRI/JSON/GLB) lives under `public/` and is fetched at runtime — never bundled.
- `public/content/*.json` is hot-swappable balance/content data; `src/content/*.ts` is the typed loader.

---

## 2. Stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Renderer | `three` + `@react-three/fiber` 9 + `@react-three/drei` 10 | R3F-only, no bare three.js |
| Physics | `@react-three/rapier` (rapier3d-compat WASM) | kinematic player + dynamic projectiles + static placed structures |
| Spatial | `three-mesh-bvh` 0.8 | per-chunk BVH for raycasts (mining, hitscan, AI LOS) |
| AI | `yuka` 0.7 | Vehicle, SteeringManager, NavMesh, GraphSearch (A*), FSM, GoalEvaluator, Vision/Memory, Trigger |
| ECS | `koota` + `koota/react` | frame state only (entities, AI handles, projectiles, particles) |
| UI | `@radix-ui/*` + `framer-motion` + Tailwind 4 | game UI surfaces |
| Audio | `THREE.Audio` + custom `GlobalAudio` wrapper | listener, music crossfade, sfx pool |
| Persistence | `drizzle-orm` + `@capacitor-community/sqlite` (native) / `sql.js` + `jeep-sqlite` (web) | only modified chunks |
| Settings | `@capacitor/preferences` | KV |
| Mobile shell | Capacitor 8 (ios, android) | |
| Bundler | Vite 6 | |
| Lint/format | Biome 2.3 | |
| Tests | Vitest 4 (node + browser) + Playwright 1.59 | |
| Language | TypeScript 5.7+ strict | |
| Package manager | pnpm 10 | |

**Explicitly not used.** No JollyPixel (cubicles + UI surfaces don't need it; R3F + drei + Rapier do this natively). No SolidJS. No Howler. No fog. No nipplejs / virtual joysticks. No skeletal animations on characters (see §3).

---

## 3. Asset pipeline & character system

### 3.1 References (gitignored)

Source asset packs live under `references/unpacked/` (gitignored). Six packs (one discarded — see §3.4):

| Pack | Contents | Format mix |
|---|---|---|
| `Kento_Nanami_Model` | 1 character T-pose | GLTF + DAE + per-bone PNGs |
| `Character_14_CG` | 1 character + 8 animations (Idle/Run/Attack/Hit/Jump/Dodge/Death/Tpose) | GLTF (T-pose) + DAE per-anim + per-bone PNGs |
| `Policeman_cg` | 1 character + 8 animations | DAE only + per-bone PNGs |
| `Hitman_Dae` | 1 character + 8 animations | DAE only + per-bone PNGs |
| `Voxel_Props_Pack` | 25 props (desks, cabinets, shelves, lamps, beds, **staircases**) | 8 GLTFs + 25 DAEs + 2 OBJs (staircases) |
| `Trap_Pack_Upload` | 51 traps | 51 GLTFs + 51 DAEs |

### 3.2 Conversion script

**File:** `scripts/convert-references.py` (bpy, `blender --background --python`).

**Smart source picker.** For each slug, scan all available source files; pick the richest by score:
```
score = 100*anim_count + 10*tex_count + 5*bones + 3*mesh_count + 2*has_emissive
        + format_pref{glb:4, gltf:3, dae:2, obj:1}
```
Animation tracks are **stripped at export** regardless of source — see §3.5.

**Per-asset operations.**
1. Clean scene (`wm.read_factory_settings(use_empty=True)`).
2. Import via extension-appropriate operator.
3. **DAE sources only:** Cycles bake of per-bone diffuse + emissive PNGs into a single 256² atlas; apply atlas to merged mesh.
4. Decimate if `decimate < 1.0`.
5. Apply transforms; origin to base centre via `origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')` then translate so `Y_min = 0`.
6. Optional vertex-color tint pass (used for HR Reaper variant).
7. Export: `export_scene.gltf(export_format='GLB', export_image_format='WEBP', export_animations=False, export_yup=True)`.
8. Update `public/assets/models/manifest.json` atomically.

**Idempotency.** Per-slug SHA-256 over (input bytes + script version + options). Skip if hash matches existing manifest entry and GLB exists.

**Configuration.** `scripts/convert-references.config.json` is the hand-edited slug map. See §3.4 for roster.

**npm hooks.**
```jsonc
"assets:convert":  "blender --background --python scripts/convert-references.py",
"assets:check":    "node scripts/check-asset-manifest.mjs",
"predev":          "pnpm assets:check",
"prebuild":        "pnpm assets:check"
```
`assets:convert` is manual (run when references change). `assets:check` runs automatically and fails the build if any manifest slug points to a missing GLB.

### 3.3 Manifest schema

```jsonc
{
  "version": 1,
  "characters": {
    "middle-manager": {
      "path": "/assets/models/characters/middle-manager.glb",
      "scale": 1.0,
      "anchor": [0, 0, 0],
      "footprintCells": [1, 2, 1],
      "tags": ["enemy", "tier-0"],
      "sourceHash": "sha256:…"
    }
  },
  "props":  { /* desk, cabinet-1..3, shelves-1..3, lamp, staircase-1, staircase-2, ... */ },
  "traps":  { /* 51 entries */ }
}
```

### 3.4 Roster (locked)

| Slug | Source | Role | Threat tier | Notes |
|---|---|---|---|---|
| `middle-manager` | Kento GLTF | default enemy | spawns at all tiers | hop-walk |
| `policeman` | Policeman DAE (atlas-baked) | tier-1 response | spawns at Threat ≥ 2 | hop-walk |
| `hitman` | Hitman DAE (atlas-baked) | tier-1.5, stealth assassin | spawns at Threat ≥ 4 | hop-walk; faster, lower HP, silenced ranged |
| `swat` | Character_14 DAE (atlas-baked; richer than the GLTF) | tier-2 | spawns at Threat ≥ 5 | hop-walk |
| `swat-squad` | reused `swat` | tier-3 | Threat ≥ 8, 2–3 instances | shared `MemoryRecord` |
| `hr-reaper` | tinted `swat` clone (auditor-amber emissive, scaled 1.5×) | floor boss | every 5 floors, mandatory | hop-walk |
| props (8 slugs) | Voxel_Props_Pack GLTFs | static | — | desks/cabinets/shelves/lamps/etc |
| `staircase-1`, `staircase-2` | Voxel_Props_Pack OBJ → GLB | placeable | — | player-built or generator-placed |
| traps (51 slugs) | Trap_Pack GLTFs | static + interactive turret variants | — | reused as world clutter / turret bases |

### 3.5 No animations — uniform hop-walk

**Decision.** Characters export T-pose only. No skeletal animations at runtime. This:
- Keeps the asset pipeline simple (no per-character anim FSM, no `useAnimations` plumbing).
- Allows Hitman to remain in roster despite being DAE-only (no animations means we don't need to bake any).
- Makes all enemy locomotion **uniform** — same shader-driven hop applied to every character → tier readability comes from silhouette/audio/speed/material, not from animation fidelity.

**Hop-walk locomotion** (all characters, regardless of slug):

| Phase | Effect |
|---|---|
| Walking | Y offset = `abs(sin(speed × time × π))² × 0.12u`; rotZ rock = `sin(time × π × speed) × 0.05`; rotX lean = `clamp(speed × 0.08, 0, 0.12)` |
| Running | Hop height `0.22u`; same curves at 1.6× rate |
| Landing squash | `scale.y *= 0.92` for 60ms at hop low point |
| Idle | Zero hop; gentle `±0.01u` Y-breathe at 0.3Hz |
| Attack | Suspend hop; lunge forward `0.4u` over 120ms ease-out, return |
| Hit | 80ms `±0.05u` random XYZ shake + emissive red flash on the entire mesh |
| Death | Y-axis rotZ → 90° over 0.6s + 0.5s dissolve fade |

**Tier readability without animation.** Silhouette (encoded in source models), audio cue per spawn (manager: distant phone ring; police: radio chatter; hitman: clicking pen; SWAT: boots-thump), material variant for HR Reaper (only character with auditor-amber emissive), movement speed (manager 1.0×, police 1.1×, hitman 1.4×, swat 1.0× w/ strafe, reaper 0.8× unstoppable).

**Player viewmodel.** **None for alpha.** Tap-to-shoot fires from camera origin; weapon icon + ammo on HUD only. Mobile-first: arms in the way of touch targets is a non-starter. Stretch-goal viewmodel post-alpha.

---

## 4. Vertical traversal: stairwells (locked, replaces elevators)

**No elevators.** Each generated floor has exactly **one Up-Door** and **one Down-Door**, both placed by the generator at distinct hallway termini. Both look like normal office double-doors with a stamped sign: `▲ UP` / `▼ DOWN`.

**Transition.** Tap door → door creaks open (300ms) → black fade-cut (200ms) → spawn at the *opposite* door of the destination floor (Up-Door of floor N → Down-Door of floor N+1). One audio cue: a single fluorescent buzz + intercom page on arrival. **Bleaker than elevator interiors.**

**Player-built stairs.** `staircase-1` / `staircase-2` GLBs are placeable as 2×3×2-cell structures via the radial build menu. Cost: planks (mined from desks/cubicle walls). Once placed, static `RigidBody` collider; player walks up via the kinematic controller. Same primitive as any other prop placement — no special platforming code.

**Holes.** Mining a floor block opens a vertical shaft. Falling damage if drop > 3 cubes; ≤3 is free. This handles "drop down to the next sector" without any floor-transition machinery.

**No skybox / no windows.** Office is windowless. Lighting is fully synthetic — see §6.

---

## 5. Input model (locked, mobile-first)

**No virtual joysticks. No nipplejs.** Single uniform input surface.

| Gesture | Action |
|---|---|
| Single tap on world surface | Pathfind to that point via Yuka NavMesh (player kinematic controller follows path) |
| Single tap on enemy | Engage: stop, face, fire equipped weapon (auto-fire while target in LOS until tap-cancel or out of range) |
| Single tap on terminal/printer/door | Interact (open stairwell, scan terminal, claim water cooler) |
| Drag (anywhere on screen) | Look (yaw + pitch); pointer-locked desktop, touch-drag mobile |
| Tap-and-hold on surface (wall/floor/ceiling/desk) | Open **radial action menu** at touch point with context-appropriate actions |
| Tap-and-hold on enemy | Radial: focus-fire / switch weapon / mark-priority / cancel |
| Two-finger pinch *(post-alpha)* | Zoom |
| Swipe down from top | Pause / open menu |

**Radial menu (context-aware).**

| Surface | Options |
|---|---|
| Floor block (free) | Place Block, Place Stairs, Place Desk, Place Terminal, Cancel |
| Wall block (placed by player) | Mine, Reinforce, Place Sign, Cancel |
| Wall block (world) | Mine, Cancel |
| Desk (world prop) | Search Drawer, Mine for Planks, Climb On, Cancel |
| Terminal | Read Memo, Hack (skill-gated), Smash, Cancel |
| Printer | Use, Rewire as Turret (skill-gated), Smash, Cancel |
| Door (Up/Down stairwell) | Enter, Block (place barricade), Cancel |

**Pathfinding parity.** Tap-to-travel uses the *same* Yuka NavMesh that enemy AI uses. Tap on non-walkable surface (wall/ceiling) → defer to radial.

**Desktop fallback (parity, not extension).** WASD overrides current path-target. ESC pauses. Right-click on enemy = focus-fire toggle (mirror of tap-and-hold). Mouse drag = look. **No sprint, no crouch, no jump key.** Vertical movement is built/world stairs or shaft drops only — same input set on phone and desktop.

---

## 6. Lighting (locked, no fog)

```
HDRI (Environment intensity 0.6) — PolyHaven indoor warehouse / open-plan office
+ DirectionalLight  (highest-Y of floor bounds, intensity 0.4, color #E8ECEE, shadow 2048², bias -0.0005)
+ RectAreaLight     × N  (one per cubicle bank, ceiling-mounted, 4×1.2u, intensity 1.4, #F4F1EA)
+ pointLight        × M  (one per occupied cubicle, distance 4, intensity 0.8, #FFD9A0)
                          M culled to ≤8 mobile / ≤16 desktop near camera by distance-sort each frame
ToneMapping: ACESFilmicToneMapping
exposure:    1.0
output:      SRGBColorSpace
fog:         NONE
```

Subtle CSS post (~5% scanline overlay, -2% saturation) via Framer Motion for menu/pause emphasis only — never during gameplay.

Day/night unused (windowless office). Lighting is static per-floor; only point-light culling varies frame-to-frame.

File: `src/render/lighting/Lighting.tsx`. Asset: `public/assets/hdri/indoor-warehouse-2k.hdr` (PolyHaven, fetched by `scripts/fetch-polyhaven.mjs`).

---

## 7. AI / Yuka pathfinding (locked)

**NavMesh source.** Walkable cells = top faces of solid floor blocks. Built into `yuka.NavMesh` via a thin `NavMesh.fromCells(cells)` helper.

**Regen.** On chunk dirty, enqueue rebuild for that chunk's tile + neighbors. Async via `src/ai/navmesh/worker.ts`. Player movement uses cached navmesh while regen pending. Budget: 1 dirty chunk per tick, debounced 100ms.

**Player tap-to-travel.** `navMesh.findPath(from, to)` → `Path` → `FollowPathBehavior` on a kinematic player Vehicle wrapper. Cancel on new tap or WASD override.

**Enemy AI.** Each enemy is a `yuka.Vehicle` with a `SteeringManager` configured per archetype:

| Archetype | Steering presets | FSM states |
|---|---|---|
| Middle Manager | obstacle-avoid + follow-path | Idle → Patrol → Investigate → Engage → Reposition → Death |
| Policeman | obstacle-avoid + follow-path + interpose | + CallBackup (at half HP) |
| Hitman | obstacle-avoid + follow-path + evade (at <30% HP) | + Stealth → Strike → Evade |
| SWAT | obstacle-avoid + follow-path + interpose | + Suppress → Flank |
| SWAT squad | as above + cohesion | shared `MemoryRecord` |
| HR Reaper | obstacle-avoid + follow-path | + TeleportToMaxAggro (cooldown) |

**Perception.** `Vision` + `MemoryRecord` per vehicle. LOS via `three-mesh-bvh` raycast against world chunks. Vision cones: manager 90°/12u, police 120°/18u, hitman 60°/24u, swat 100°/16u, reaper 360°/30u.

**Goal arbitration.** SWAT and Reaper use Yuka `GoalEvaluator` to switch between Suppress / Flank / Pursue based on player visibility, distance, and squad health.

**Trigger regions.** Yuka `Trigger` + `RectangularTriggerRegion` — water-cooler claim radius, supply-closet trespass alerts, stairwell-door aggro zones.

**Tick.** `EntityManager.update(dt)` ticks vehicles + triggers in lockstep with R3F `useFrame`. Logic tick capped to 30Hz on mobile, 60Hz desktop; render decoupled.

**Debug overlays** under `src/verify/`: `<NavMeshViz/>`, `<VisionConeViz/>`, `<PathViz/>`, `<BVHViz/>`, `<FpsHUD/>`. Toggleable via `?debug=...` query string.

---

## 8. Persistence (locked)

### 8.1 drizzle schema (`src/db/schema/`)

| Table | Columns |
|---|---|
| `world_meta` | seed, current_floor, threat, deaths, kills, played_seconds, schema_version |
| `chunks` | floor, chunk_x, chunk_z, dirty_blob (BLOB), updated_at — *only modified chunks*; pristine regenerate from seed |
| `placed_structures` | id, floor, slug, x, y, z, rot, hp |
| `claimed_water_coolers` | floor, x, y, z, claimed_at |
| `inventory` | slot, item_slug, qty |
| `weapons_owned` | slug, ammo, unlocked_at |
| `journal_entries` | id, floor, ts, kind, body |
| `recipes_known` | slug, discovered_at |
| `kills` | slug, count, last_at |

### 8.2 Adapter (`src/db/client.ts`)

```
runtime detect:
  if Capacitor.isNativePlatform() → @capacitor-community/sqlite
  else                            → sql.js + jeep-sqlite (web component, mounted once at boot)
```

### 8.3 Migrations

`drizzle-kit` SQL files in `src/db/migrations/`. Run on first boot per device. Forward-only; schema_version recorded in `world_meta`.

### 8.4 Save loop

Koota world subscribes to component changes (chunk dirty, inventory delta, water-cooler claim) → enqueue write → debounced batch flush every 1s OR on `pagehide` / `blur` / Capacitor `appStateChange`. Single write transaction per flush.

### 8.5 Preferences (`src/db/preferences.ts`, typed wrapper over `@capacitor/preferences`)

`volume_master`, `volume_sfx`, `volume_music`, `look_sensitivity`, `graphics_tier`, `world_seed`, `last_floor`, `controls_scheme`.

### 8.6 Static content

`public/content/{recipes,memos,narrator-grammar}.json` — typed loaders in `src/content/`, validated against zod schemas at build time via `scripts/build-content.mjs`.

---

## 9. State split (locked)

| Layer | Where | What |
|---|---|---|
| Frame state | Koota | entity transforms, yuka.GameEntity refs, projectiles, particles, weapon cooldowns, AI handles |
| Persistent | drizzle/SQLite | dirty chunks, placed structures, claimed water coolers, journal, recipes, kills, deaths, current floor depth, inventory, weapon unlocks, world seed |
| Settings | `@capacitor/preferences` | volume, sensitivity, graphics tier, last seed, controls scheme |
| Static | `public/assets`, `public/content` | textures, HDRI, GLB models, recipes, grammar, memos |

Rule: *per-frame ephemeral → Koota. Survives session → drizzle.*

---

## 10. Threat system (locked)

`world_meta.threat: number` (float, 0..∞). Persisted.

| Event | Δ |
|---|---|
| Middle-manager kill | +1.0 |
| Policeman kill | +2.0 |
| Hitman kill | +2.5 |
| SWAT kill | +3.0 |
| In-game minute idle | -0.05 |
| New floor entered | -0.5 |

**Spawn director** consults `threat` per chunk-spawn:

| Threat range | Spawn pool |
|---|---|
| 0 ≤ t < 2 | middle-manager only |
| 2 ≤ t < 4 | + occasional 1× policeman |
| 4 ≤ t < 5 | + 1× hitman (stealth) |
| 5 ≤ t < 8 | + 1× swat |
| 8 ≤ t      | + swat squads (2–3) |

**HR Reaper** ignores threat — appears regardless on every 5th floor as the floor boss.

---

## 11. Brand / design tokens (locked)

### 11.1 Typography

| Role | Font | Use |
|---|---|---|
| Display | **Departure Mono** (variable, self-hosted) | landing tagline, stamps, header lockups |
| Body | **Inter** (optical sizes, tabular numerals) | UI surfaces, forms, journal |
| In-world / forms only | **JetBrains Mono** | terminal CRTs, memos, employee file |

No console-font default. The display-mono is the *bureaucratic* typographic note; the body is humane.

### 11.2 Color tokens

```css
:root {
  --ink:             #15181C;  /* almost-black slate; chrome text, weapon outlines */
  --paper:           #F4F1EA;  /* warm office-paper; UI surfaces, memos */
  --carpet:          #5C6670;  /* cool grey-blue; floor base */
  --ceiling-tile:    #E2DFD6;  /* off-white; ceiling base */
  --laminate:        #C7B89A;  /* warm wood-laminate; desks */
  --fluorescent:     #E8ECEE;  /* cool off-white; light tint */
  --auditor-red:     #B33A3A;  /* enemy accents, damage flash, URGENT stamps */
  --approval-green:  #3F8E5A;  /* health, APPROVED stamps */
  --terminal-amber:  #E0A33C;  /* in-world CRTs only — never UI chrome */
  --toner-cyan:      #2EA8C9;  /* ammo UI, projectile trails */
}
```

### 11.3 Landing page (uplift, not generic)

- **Hero:** HDRI-lit voxel middle manager (Kento GLB), three-quarter view, stapler holstered. An Auditor (manager-tinted amber) visible down the hallway behind him.
- **Tagline** (Departure Mono, all-caps, hairline rules above and below): *"There has been a reorganization."*
- **Subtagline** (Inter): *"You have been pre-assigned to Floor 1. Please report to your desk."*
- **Buttons**: `CLOCK IN` (primary, red rubber-stamp animation on click) / `LOAD EMPLOYEE FILE` (ghost button, paper outline).
- **Audio**: distant intercom page on first user gesture, then office hum loop.
- **Motion** (Framer): lights flicker once on load, then steady; subtle paper-shift on hover; stamp-press depression on click.

### 11.4 In-game HUD chrome

- Top-left: floor number ("FLOOR 003") + stamped APPROVED/PENDING badge.
- Top-right: Threat meter as a redacted document strip — fills with auditor-red as threat rises.
- Bottom-left: health (approval-green) + armor (paper) bars styled as form-field rectangles.
- Bottom-right: ammo (toner-cyan) + weapon icon (Departure Mono numerals).
- Center crosshair: 4px hairline cross only when target in range; otherwise nothing (mobile-clean).

---

## 12. Performance budgets (locked)

| Metric | Mobile target (iPhone 12) | Desktop target |
|---|---|---|
| Frame budget | 22ms (~45fps) | 16ms (~60fps) |
| Draw calls | ≤ 250 | ≤ 500 |
| Active point lights | ≤ 8 | ≤ 16 |
| Heap | ≤ 350 MB | ≤ 700 MB |
| GLB total weight | ≤ 12 MB | ≤ 12 MB |
| HDRI | 2k, ≤ 4 MB | 2k, ≤ 4 MB |
| Initial JS bundle (gzip) | ≤ 350 KB | ≤ 350 KB |

Enforced via:
- `size-limit` on bundle.
- Playwright perf spec asserting frame time on a fixed deterministic seed.
- Draw-call HUD overlay in `<FpsHUD/>` (debug only).

---

## 13. Testing (locked)

- **Unit (Vitest node project):** weapon math, threat math, recipe resolution, navmesh helpers, damage zones, chunk dirty diffing, persistence repos.
- **Browser (Vitest browser project):** R3F components, BVH raycast, Rapier collisions, audio loader, drei `<Gltf/>` load.
- **E2E (Playwright):** golden-path spec — boot → spawn on floor 1 → kill 1× middle-manager → mine 1 desk → place 1 staircase → climb → enter Up-Door → arrive on floor 2 → quit → resume on floor 2 with Threat ≥ 1. Plus a perf spec asserting frame budget on a fixed seed.

---

## 14. PRQ decomposition (locked)

Each PRQ is a single file in `docs/plans/prq-NN-<slug>.md`. Numbered tasks `T1..Tn` per PRQ, with explicit acceptance criteria and tests. The `.agent-state/directive.md` enforces strict ordering: do not start PRQ-(N+1) until PRQ-N is committed, CI green, and any e2e tests for that PRQ pass.

| PRQ | Subject |
|---|---|
| PRQ-00 | Repo scaffolding (pnpm, vite, R3F, biome, tsconfig, vitest, playwright, capacitor, drizzle, koota, yuka, three-mesh-bvh, radix, framer, tailwind tokens) |
| PRQ-01 | Asset pipeline: bpy convert script + manifest + check + PolyHaven HDRI/textures fetch |
| PRQ-02 | Render core: R3F canvas, lighting, environment, ground tile, single GLB instance smoke-test |
| PRQ-03 | Voxel/chunk world: chunk data, instanced block meshes, per-chunk BVH, generator (cubicle banks + hallways + stairwell doors) |
| PRQ-04 | Persistence: drizzle schema, web + native adapter, migrations, dirty-chunk save, preferences |
| PRQ-05 | Input: tap-to-travel, drag-look, tap-and-hold radial, desktop fallback |
| PRQ-06 | Yuka navmesh from chunks + player path-follow controller (single consumer) |
| PRQ-07 | Hop-walk locomotion + character mount (`<Character slug=…/>`) |
| PRQ-08 | Enemy AI: middle-manager FSM, perception, steering, BVH-LOS, attack hitscan |
| PRQ-09 | Combat: weapons table, projectiles, damage, HUD (radix + framer), ammo/health pickups |
| PRQ-10 | Threat system: kill tracking → tier spawn director → Policeman + Hitman + SWAT FSMs |
| PRQ-11 | Building/mining: tap-and-hold radial → place/mine; staircases as placeable structures; vertical shaft drops |
| PRQ-12 | Stairwells + floor transitions: Up/Down doors, fade-cut, generator places one of each per floor |
| PRQ-13 | HR Reaper boss + every-5-floors gate |
| PRQ-14 | UI surfaces: Landing, EmployeeFile, PauseMenu, JournalSheet, GameOver — typography, design tokens, framer transitions |
| PRQ-15 | Audio: GlobalAudio wrapper, ambience, weapon SFX, intercom pages, threat-tier audio cues |
| PRQ-16 | Mobile shell: Capacitor 8 ios + android wraps, splash, icons, build scripts |
| PRQ-17 | E2E golden path |
| PRQ-18 | Perf pass: instancing audit, draw-call budget, mobile fps target ≥45 |

---

## 15. Autonomy & agent state

- `<repo>/CLAUDE.md` — repo memory, includes `~/.claude/profiles/ts-browser-game.md` and `~/.claude/profiles/standard-repo.md` via `@<absolute-path>` includes per global convention.
- `<repo>/AGENTS.md` — autonomy rules + session startup (read digest → cursor → directive → current PRQ).
- `.agent-state/`:
  - `directive.md` — `Status: ACTIVE`; PRQ queue in §14; hard rule "do not start PRQ-(N+1) until PRQ-N is green".
  - `digest.md` — ~10-line state summary; auto-updated on commit.
  - `cursor.md` — current PRQ + Task + branch.
  - `decisions.ndjson` — append-only.
- `.claude/settings.json` — repo-local permissions/hooks.
- `.claude/gates.json` — per-commit coverage gates:
  - `src/render/**` changes require `e2e/render-*.spec.ts` updates OR commit body `// no-visual-impact: <≥10-word reason>`.
  - `src/db/**` changes require `src/db/**/*.test.ts` updates OR `// no-schema-impact: <≥10-word reason>`.
  - `src/ai/**` changes require `src/ai/**/*.test.ts` updates OR `// no-ai-impact: <≥10-word reason>`.
  - Forbidden bash: `--no-verify`, `git push --force` (use `--force-with-lease`).
- All hooks idempotent and consistent with grovekeeper / chonkers conventions so the autonomous-loop skill behaves identically.

---

## 16. Out of scope (alpha)

- Multiplayer (single player only).
- Skeletal animations on characters (uniform hop-walk only).
- First-person viewmodel arms.
- Inventory beyond a fixed 8-slot quickbar + ammo pool.
- Save slots (single autosave per device).
- Localization (English only; copy uses tokenized strings to keep i18n cheap later).
- Mod support.
- In-app purchases / ads / telemetry.
- Cloud sync (post-alpha; SQLite blob export goes through `@capacitor/preferences` for now if needed manually).
- Day/night cycle (windowless).
- Outdoor biomes / non-office environments.

---

## 17. Open risks (and mitigation)

| Risk | Mitigation |
|---|---|
| Yuka navmesh rebuild cost on big chunk dirty | Worker-thread; per-chunk regen; cached fallback |
| BVH raycast cost with many enemies | Per-chunk BVH (already chunked); LOS update cadence 5Hz not 60Hz |
| GLB total weight on mobile | KTX2/WEBP textures; aggressive draco compression in bpy export; lazy-load per floor |
| sql.js write latency | Debounced flush; transaction batching; single writer |
| Tap-and-hold conflicts with drag-look | Hold threshold 220ms with ≤8px movement tolerance; otherwise interpret as drag |
| Threat decay tuning | All values in `public/content/balance.json`; hot-tunable without rebuild |

---

## 18. Approvals log

| Section | Decision | Approved by |
|---|---|---|
| §0 Creative direction | DOOM meets Minecraft, in cubicles; tonal pillars; typography; tokens | user, 2026-04-29 |
| §1 Repo + module layout | `app/` + `public/` at root, `src/` for engine | user, 2026-04-29 |
| §2 Stack | R3F + drei + Rapier + Yuka + Koota + Radix + Framer + drizzle/Capacitor SQLite + Capacitor 8 — no JollyPixel | user, 2026-04-29 |
| §3 Asset pipeline + roster + no animations | Smart-source bpy script; uniform hop-walk; Hitman retained | user, 2026-04-29 |
| §4 Stairwells replace elevators | Approved: bleak Up/Down doors with fade-cut; player-built stairs; shaft drops | user, 2026-04-29 |
| §5 Input model | Tap-to-travel, drag-look, tap-and-hold radial, no joysticks | user, 2026-04-29 |
| §§6–11 Lighting / AI / Persistence / State / Threat / Brand | Inferred from earlier approvals; user said "all the rest you should have answers to already" | user, 2026-04-29 |
| §§12–18 Performance / Testing / PRQs / Autonomy / Scope / Risks | Same | user, 2026-04-29 |

---

## 19. Alpha definition-of-done (goalpost)

**The reference goalpost.** `references/poc.html` (824 lines, vanilla three.js r128 CDN) is the bar to clear. It already includes: fog-compressed dark office, textured carpet/ceiling/walls, primitive voxel-prop middle manager (red suit + black tie), projectile combat, water-cooler healing, "mine cabinets / craft memos" directive. **Our alpha must visibly and qualitatively surpass it on every axis** — not just match.

**Alpha "one playable floor" deliverable.** A floor counts as alpha-done when *every* item below is true, validated locally **and** post-squash-merge on GitHub Pages.

### 19.1 Visual bar (must obviously beat the POC)

- [ ] Real GLB characters (`middle-manager` from Kento) walking the floor — not red-cube approximations.
- [ ] PolyHaven textures on every world surface (carpet, ceiling tile, drywall, laminate desk).
- [ ] HDRI-driven IBL ambient + RectAreaLight ceiling banks + warm desk-lamp point lights (culled).
- [ ] No fog. Draw distance gated by chunk culling. Visibly cleaner than the POC's `FogExp2(0x222a22, 0.045)` murk.
- [ ] ACESFilmic tonemap + sRGB output color-managed; no MeshLambert + ad-hoc lighting.
- [ ] Hop-walk locomotion visible on every character.
- [ ] Stamped Departure Mono / Inter typography across all chrome — not VT323 console default.

### 19.2 Gameplay bar

- [ ] Tap-to-travel via Yuka NavMesh works (player + at least one enemy share the same navmesh).
- [ ] Drag-look pointer-locks on desktop, touch-drags on mobile.
- [ ] Tap-and-hold radial menu opens on every supported surface (floor / world wall / placed wall / desk / terminal / printer / door).
- [ ] At least one weapon (Stapler — melee, infinite ammo) and one ranged weapon (Three-Hole Punch) are usable.
- [ ] Enemies (≥3 middle-managers spawned per floor) detect via Yuka vision + LOS, engage, take damage, die with the dissolve animation.
- [ ] Place block + mine block + place stair (`staircase-1` GLB) works end-to-end.
- [ ] Mine through floor → fall to lower y → take damage if drop > 3 cubes.
- [ ] Up-Door + Down-Door each present on the floor; tapping Up-Door triggers the fade-cut transition (even if the *destination* is just a re-roll of floor 1 for alpha).
- [ ] Threat meter ticks +1 per kill, decays on idle, persists across reload.
- [ ] Water-cooler claim gates respawn point.

### 19.3 Persistence bar

- [ ] Quit (window close / `pagehide`) → relaunch → world seed, threat, kills, claimed cooler, placed structures, dirty chunks, inventory, weapons-owned all restored exactly.
- [ ] First boot creates SQLite via the right adapter (sql.js on web, capacitor-sqlite on native). Migration runs once.
- [ ] Preferences (volume, look_sensitivity, graphics_tier) survive reload.

### 19.4 Performance bar (validated, not aspirational)

- [ ] Playwright perf spec asserts ≥ 45 fps for 30 seconds on a fixed-seed floor on the CI Linux runner (deterministic frame budget proxy for the iPhone 12 target).
- [ ] Bundle size: initial JS gzip ≤ 350 KB; total GLB weight ≤ 12 MB; HDRI ≤ 4 MB.
- [ ] Draw calls overlay shows ≤ 250 mid-floor.

### 19.5 Validation gates (in order, hard-blocking)

1. **Local gameplay validation** — `pnpm dev` → manual run-through of the gameplay bar (§19.2), recorded as a screen capture committed to `docs/qa/alpha-local.{webm,mp4}`. Owner: human.
2. **Local visual validation** — `pnpm test:e2e -- --grep @golden` runs the golden-path Playwright spec, including pixel-comparison snapshots of: landing page, mid-floor screenshot at fixed seed, post-kill HUD state. Snapshots committed under `e2e/__snapshots__/`. Owner: agent.
3. **Local perf validation** — `pnpm test:e2e -- --grep @perf` passes the 45fps/30s assertion. Owner: agent.
4. **Squash-merge to `main`** — only after gates 1–3.
5. **Post-merge GitHub Pages validation** — CI deploys to GitHub Pages; a follow-up Playwright job runs the *same* golden-path + perf specs against the deployed URL. Failure here reverts via a fast-follow PR. Owner: CI + agent.

**No alpha claim is made until gate 5 is green.** The agent must not declare alpha complete based on local results alone.

---

## 20. GitHub repo + Pages bootstrapping (locked)

**Org:** `arcade-cabinet`
**Repo:** `arcade-cabinet/department-of-redundancy-department` (public)
**Default branch:** `main`
**License:** MIT (matches arcade-cabinet org default — confirm against grovekeeper/chonkers; we'll match whatever those use)
**Branch protection:** managed at org level (arcade-cabinet Enterprise rulesets). Do NOT add per-repo branch-protection API calls in `scripts/setup-github.mjs`.

### 20.1 Pre-flight (one-time, by agent on first run of PRQ-00)

```bash
# verify gh auth
gh auth status

# verify org membership
gh api user/memberships/orgs/arcade-cabinet --jq '.role'

# confirm name not taken
gh repo view arcade-cabinet/department-of-redundancy-department 2>/dev/null && exit 1 || true
```

### 20.2 Repo creation + initial push (PRQ-00 final task)

```bash
git init
git add -A
git commit -m "feat: initial scaffolding (PRQ-00)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
gh repo create arcade-cabinet/department-of-redundancy-department \
  --public \
  --source=. \
  --remote=origin \
  --push \
  --description "DOOM meets Minecraft, in cubicles. Mobile-first first-person voxel-prop FPS." \
  --homepage "https://arcade-cabinet.github.io/department-of-redundancy-department"
```

### 20.3 Repo settings to apply via `gh` (idempotent, in `scripts/setup-github.mjs`)

```bash
# Branch protection on main
gh api -X PUT repos/arcade-cabinet/department-of-redundancy-department/branches/main/protection \
  --input scripts/branch-protection.json
# - require status checks: ci, e2e, perf, deploy-pages, post-deploy-validate
# - require linear history (squash-merge only)
# - dismiss stale reviews on push
# - require conversation resolution

# Topics
gh api -X PUT repos/arcade-cabinet/department-of-redundancy-department/topics \
  -F names[]=game -F names[]=fps -F names[]=voxel -F names[]=r3f -F names[]=capacitor -F names[]=mobile-game

# Discussions on (for community)
gh api -X PATCH repos/arcade-cabinet/department-of-redundancy-department \
  -F has_discussions=true \
  -F has_issues=true \
  -F has_wiki=false \
  -F has_projects=false \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true

# Pages: deploy from GitHub Actions
gh api -X POST repos/arcade-cabinet/department-of-redundancy-department/pages \
  -F build_type=workflow
```

### 20.4 Workflow architecture (aligned to mean-streets — current org reference)

**Anchor.** Five workflows, exact mean-streets shape:

| File | Trigger | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | `pull_request:` only | typecheck, lint, test:node, test:dom (browser), release-gate test, build, browser/e2e jobs |
| `.github/workflows/cd.yml` | `push: branches: [main]`, `workflow_dispatch` | release-checks (re-run typecheck/lint/test:node + e2e:ci) → build → Pages deploy → `validate-deployed` (Playwright against the live `page_url`) |
| `.github/workflows/release.yml` | `push: branches: [main]`, `workflow_dispatch` (with `ref` input) | release-please PR; on release-cut tag → web tarball + Android AAB attached to the GitHub Release |
| `.github/workflows/automerge.yml` | `pull_request_target:` | auto-approve + auto-squash-merge dependabot + release-please PRs |
| `.github/workflows/analysis-nightly.yml` | `schedule:` (cron) + `workflow_dispatch` | (post-alpha) nightly perf/Lighthouse/bundle-size trend, opened as an issue on regression |

**Ownership rule** (mean-streets convention, **flipped from grovekeeper/chonkers' earlier split**):
- `cd.yml` = continuous deploy of HEAD-of-main to GitHub Pages (same on every push).
- `release.yml` = release-please + **tag-cut** artifacts only (web tarball + Android AAB attached to the GitHub Release). No Pages deploy here.
- The two workflows both trigger on `push: main` but never write the same artifact: `cd.yml` writes to Pages every push; `release.yml` writes a tag/release **only when release-please cuts one** (gated on `release_created == 'true'`).

`ci.yml` is `pull_request:` only — never `push: main` — to avoid the duplicate-work + phantom-startup-failure pattern documented in the org.

### 20.5 Pinned action SHAs (exact match to mean-streets)

Workflows MUST use these pins. SHA-pinning is non-negotiable per org standard. **Pins below are mean-streets's current set** — use these, not grovekeeper/chonkers's older equivalents.

```yaml
- uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd                    # v6.0.2
- uses: pnpm/action-setup@078e9d416474b29c0c387560859308974f7e9c53                   # v6.0.1
- uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f                  # v6.3.0
- uses: actions/setup-java@be666c2fcd27ec809703dec50e508c2fdc7f6654                  # v5.2.0
- uses: android-actions/setup-android@40fd30fb8d7440372e1316f5d1809ec01dcd3699       # v4.0.1
- uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a             # v7.0.1
- uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9       # v5.0.0
- uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d             # v6.0.0
- uses: actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128                # v5.0.0
- uses: googleapis/release-please-action@5c625bfb5d1ff62eadeeb3772007f7f66fdcf071    # v4.1.3
- uses: softprops/action-gh-release@b4309332981a82ec1c5618f44dd2e27cc8bfbfda         # v2
```

Versions: `pnpm 10.33.0`, `node 22`, `java 21 (temurin)` for Android, `android api-level 34, build-tools 34.0.0`. **Never bump these without a coordinated bump across mean-streets + DORD (and ideally grovekeeper + chonkers in the same wave).** When a bump happens, mean-streets is the canonical reference — DORD follows.

`release.yml` carries `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'` on the `release-please` job (mean-streets parity) until the release-please action pin is updated to support Node 24 natively.

### 20.6 `ci.yml` shape

```yaml
name: CI

on:
  pull_request:

permissions:
  contents: read

jobs:
  core:        # checkout + pnpm + node 22 + install --frozen-lockfile + typecheck + lint + test:node + build
  browser:     # same setup + playwright install chromium + xvfb-run -a pnpm test:browser
  e2e-smoke:   # same setup + playwright install chromium + pnpm test:e2e:ci
               # uploads playwright-report artifact on failure
  bundle-size: # same setup + pnpm build + size-limit (asserts §12 budgets)
```

Job timeouts: `core` 15min, `browser` 15min, `e2e-smoke` 20min, `bundle-size` 15min.

### 20.7 `cd.yml` shape (continuous deploy — mean-streets parity)

```yaml
name: CD

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: cd-deploy
  cancel-in-progress: false

jobs:
  release-checks:      # checkout + pnpm + node 22 + install
                       # typecheck + lint + test:node + (post-alpha) e2e:ci
                       # deterministic re-gate before any deploy
  deploy-pages:        # needs: release-checks
                       # checkout (no LFS) + install + pnpm assets:check + pnpm build
                       #   env: NODE_ENV=production, GITHUB_PAGES=true,
                       #        NODE_OPTIONS="--max-old-space-size=4096"
                       # post-build LFS pull only for public/assets/{audio,models}/
                       # configure-pages + upload-pages-artifact (path: dist) + deploy-pages
                       # environment: { name: github-pages, url: page_url }
  validate-deployed:   # needs: deploy-pages
                       # checkout + install + playwright install chromium
                       # DORD_BASE_URL=${{ needs.deploy-pages.outputs.page_url }}
                       # pnpm test:e2e -- --grep '@golden|@perf'
```

**Ownership.** `cd.yml` deploys HEAD-of-main to Pages on every push. It does NOT touch tags or GitHub Releases. **Failure of `validate-deployed` does not roll back the deploy** — it surfaces as a red CD run on `main` that triggers a fast-follow fix-forward PR (mean-streets convention).

### 20.8 `release.yml` shape (release-please + tagged artifacts — mean-streets parity)

```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      ref:
        description: 'Git ref to build (branch or tag)'
        default: 'main'
        required: false

permissions:
  contents: write
  pull-requests: write

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  release-please:      # googleapis/release-please-action@5c625bfb… (v4.1.3)
                       # token: ${{ secrets.CI_GITHUB_TOKEN }}
                       # config-file: release-please-config.json
                       # manifest-file: .release-please-manifest.json
                       # env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'
                       # outputs: release_created, tag_name
  build-release:       # if: needs.release-please.outputs.release_created == 'true'
                       # checkout @ tag_name + lfs:true
                       # pnpm install + pnpm build (NODE_ENV=production)
                       # tar -czf department-of-redundancy-department-web.tar.gz dist/
                       # softprops/action-gh-release@b4309332… with tag_name + files
  android:             # if: release_created (gate on android/gradlew presence)
                       # checkout @ tag_name + lfs:true
                       # setup-java 21 temurin + android api 34, build-tools 34.0.0
                       # pnpm install + pnpm exec cap sync android
                       # decode signing keystore from ANDROID_KEYSTORE_BASE64 secret
                       # ./gradlew bundleRelease (signed AAB) OR bundleDebug (no keystore)
                       # upload-artifact (mean-streets uploads to actions artifacts;
                       # the AAB is then manually attached to the release for now —
                       # post-alpha we'll automate this attach via gh-release action)
```

**Ownership.** `release.yml` only writes outputs when release-please cuts a tag. It never deploys to Pages. The web tarball and Android AAB are attached to the GitHub Release for that tag.

The two workflows safely co-trigger on `push: main`: `cd.yml` always deploys; `release.yml`'s expensive build jobs are gated on `release_created == 'true'` so they only run on the *one* push where release-please flips that bit (the merge of the release-please PR).

### 20.9 `automerge.yml` shape (mean-streets parity)

```yaml
name: Automerge

on:
  pull_request_target:
    types: [opened, synchronize, reopened]

permissions:
  contents: write
  pull-requests: write

jobs:
  dependabot:        # if: github.actor == 'dependabot[bot]'
                     # gh pr review --approve && gh pr merge --auto --squash
  release-please:    # if: github.actor == 'github-actions[bot]' && head.ref starts with 'release-please--'
                     # gh pr review --approve && gh pr merge --auto --squash
```

### 20.10 Pages deploy specifics

- **Vite base path:** `'/department-of-redundancy-department/'` when `process.env.GITHUB_PAGES === 'true'`. Default `'/'` (local dev + Capacitor).
- **WASM:** `sql.js` + `rapier3d-compat` WASM served from `public/wasm/`. Vite copies on build.
- **LFS audio/GLB handling:** `cd.yml` mirrors grovekeeper's "checkout-without-LFS, build JS, then LFS-fetch only `public/assets/audio` + `public/assets/models` after the build" pattern — avoids disk-IO eviction on `westcentralus` spot runners. We adopt this from day one to avoid the migration grovekeeper had to do post-incident.
- **No COOP/COEP headers** (single-threaded WASM, no SharedArrayBuffer needed).
- **Custom 404.html** copied to `dist/` for SPA routing on Pages (`react-router` fallback).

### 20.11 Required workflows checklist (mean-streets parity)

| Workflow | Maps to mean-streets file | Required for | Owner |
|---|---|---|---|
| `ci.yml` | mean-streets `ci.yml` | every PR | always |
| `cd.yml` | mean-streets `cd.yml` | every push to main → Pages | always |
| `release.yml` | mean-streets `release.yml` | release-please + tagged web tarball + Android AAB | always |
| `automerge.yml` | mean-streets `automerge.yml` | dependabot + release-please auto-merge | always |
| `analysis-nightly.yml` | mean-streets `analysis-nightly.yml` | nightly perf/Lighthouse/bundle-size trend; opens issues on regression | added at PRQ-RC0 |

### 20.12 Issue + PR templates

- `.github/ISSUE_TEMPLATE/bug.yml`, `feat.yml`, `prq-blocker.yml`
- `.github/PULL_REQUEST_TEMPLATE.md` — checklist tying back to §14 PRQ + §19 DoD gates
- `release-please-config.json` + `.release-please-manifest.json` at repo root, conventional-commit-driven, matching grovekeeper / chonkers configs

---

## 21. Asset roster addendum (post-spec drops)

Two additional reference packs landed after the initial spec was written. Folded in:

| New slug | Source | Role | Notes |
|---|---|---|---|
| `hr-reaper` | **`Gojo Satoru Character/Gojo Satoru GLTF.gltf`** (replaces the earlier "tinted-swat" composite) | Floor boss, every 5th floor | Gojo's coat-and-headband silhouette reads as *otherworldly authority* — far better than a recolored SWAT. Apply auditor-amber emissive tint via vertex-color pass. Scale 1.5×. |
| `hitman` | **`Hitman_obj/Hitman_T_Pose.obj` + `.mtl` + `.png`** (replaces the per-bone DAE bake path) | Tier-1.5 stealth assassin | OBJ already ships a unified texture; no atlas-bake needed. Saves a Cycles bake step per pipeline run. |

**Source-picker rule update.** The bpy script's source picker (§3.2) gets one extra tie-break: when a candidate source has 0 animations to import (we strip them anyway) AND has unified texture coverage (single `.png` + `.mtl` for OBJ; embedded textures for GLTF), prefer it over a DAE that would require atlas-baking. This is a strict performance/simplicity win, not a quality regression — same end-state pose, fewer pipeline steps.

The spec's §3 roster remains valid; this section is the canonical override for the two slugs above.

---

## 22. Milestones — Alpha → Beta → RC

The PRQ queue in §14 covers everything through alpha. Beta and RC are sequenced post-alpha by content/polish/scale objectives. Each milestone has its own DoD gate analogous to §19, and graduates only after both local + post-deploy GitHub Pages validation passes.

### 22.1 Alpha (PRQ-00 → PRQ-18)

**Definition.** §19. One playable floor, end-to-end, persistent, deployed to GitHub Pages, validated post-merge.

**Outputs.**
- Public repo, public Pages URL, working build pipeline.
- Single floor type (open-plan cubicle bank + hallways + Up/Down doors + supply closet).
- Single weapon-set (Stapler + Three-Hole Punch).
- Single enemy archetype actively spawning (`middle-manager`); higher-tier FSMs implemented but spawn-gated by Threat thresholds reachable via play.
- Hop-walk locomotion. No animations.
- Persistence + preferences round-tripping.
- HR Reaper boss spawning on floor-5 (since alpha closes the loop, the boss has to be reachable).

**Cut from alpha:** audio polish (basic SFX only, no music), full weapon roster, building-skill gates, recipe discovery beyond a hardcoded test recipe.

### 22.2 Beta (PRQ-B0 → PRQ-B9)

**Theme:** *content depth + tonal polish*. Same loop, much richer.

| PRQ | Subject | Why now |
|---|---|---|
| PRQ-B0 | Full weapon roster: Letter Opener, Toner Cannon, Fax Machine, Whiteboard Marker | Combat variety |
| PRQ-B1 | Recipe discovery system: pickup → bench at Supply Closet → combine → recipe persists in `recipes_known` | The "Minecraft" pillar finally lights up |
| PRQ-B2 | Floor archetypes: open-plan, executive corridor (long sight lines, fewer cubicles, more doors), basement (low ceilings, exposed pipes, more enemies), break-room (sparse, water-cooler-rich) | Floors stop feeling samey |
| PRQ-B3 | Trap pack integration: 5–10 of the 51 trap GLBs as **interactive hazards** (shredder pits, fax-mortar, sprinkler steam) — proximity damage; some rewireable as turrets via radial menu | Reuses the asset library properly |
| PRQ-B4 | Audio polish: ambience layers per floor archetype, intercom-page pool (Tracery-grammar driven), threat-tier audio escalation, weapon SFX variety, footstep SFX surface-aware | Mood |
| PRQ-B5 | Tracery narrator: in-world memos picked up → randomized text via `narrator-grammar.json` → journal | Worldbuilding |
| PRQ-B6 | Damage zones (head/torso/limbs) + crit feedback; visible HP bars suppressed (corporate horror — you don't see them dying, just tally) | Combat feel |
| PRQ-B7 | Enemy variants per archetype (manager-with-clipboard ranged, manager-with-mug melee, etc.) via tag-driven loadouts on the same GLB | Visible variety without new assets |
| PRQ-B8 | Building-skill gates: certain placements (turret rewire, terminal hack) require recipe-known + tool-equipped + skill-tier check | Progression |
| PRQ-B9 | Mobile UX pass: tap-target sizing, safe-area insets per device class, haptics (Capacitor `Haptics`), pinch zoom (post-alpha decision: **lands in beta, not later**) | Mobile-shippable |

**Beta DoD additions over alpha:**
- 4 distinct floor archetypes generate cleanly with no chunk-stitch artifacts.
- ≥ 5 weapons usable.
- ≥ 5 traps appear in floors and damage the player.
- Recipe loop works: pickup → combine → use a created item that wasn't in inventory at start.
- Memos appear, are readable, persist in journal.
- Mobile playthrough on a real iPhone 12 sustains ≥ 45 fps for a full floor clear.
- All §19 alpha gates still pass.

### 22.3 RC (PRQ-RC0 → PRQ-RC7)

**Theme:** *ship readiness*. No new mechanics. Hardening, accessibility, store packaging.

| PRQ | Subject | Why |
|---|---|---|
| PRQ-RC0 | Performance hardening: instancing audit, draw-call budget enforcement on every floor archetype, GLB lazy-load per floor, KTX2 audit | Mobile target ≥ 50 fps on iPhone 12, ≥ 30 fps on iPhone SE 2nd gen |
| PRQ-RC1 | Accessibility: WCAG-AA color contrast on chrome, screen-reader-friendly menus (radix already 80% there), `prefers-reduced-motion` honored on Framer transitions, controller remapping, configurable look sensitivity per axis | Inclusive ship |
| PRQ-RC2 | Save robustness: corruption recovery (schema-migration error → backup-and-reset prompt), export/import save blob via Capacitor file picker, per-device anonymized telemetry opt-in (counts only, no content) | Data integrity |
| PRQ-RC3 | Visual polish pass: dust-mote particles in light cones, paper-shred + ink-splatter density tuned, dissolve-death shader audited per character, hit-feedback flash duration A/B-tuned to 80–120ms range | Quality |
| PRQ-RC4 | Native packaging: iOS code-signing config, Android keystore, app icons + splash screens at all required densities, App Store / Play Store metadata, screenshots per device class | Store-ready |
| PRQ-RC5 | Localization scaffold: extract all hardcoded strings to `public/content/strings.en.json`; i18n loader; one additional locale stubbed (es) for verification | Future-proofs the ship |
| PRQ-RC6 | RC e2e suite: full content runs (5 floors, every weapon fired, every trap triggered, full recipe loop, save/load mid-fight, alt-tab/backgrounding, pause/resume) | Pre-ship gauntlet |
| PRQ-RC7 | Release process: release-please workflow, conventional-commit enforcement on `main`, automatic CHANGELOG, tagged GitHub releases pushing to TestFlight + Play Internal Testing tracks | Repeatable releases |

**RC DoD additions:**
- All §19 + §22.2 gates pass.
- Crash-free over a 30-minute soak test on iPhone 12 + iPhone SE.
- App Store + Play Store builds upload successfully (TestFlight / Internal Testing).
- Lighthouse score on the GitHub Pages deploy: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
- Telemetry verified: opt-in toggle works; default OFF; no payload sent without consent.

### 22.4 Post-RC (out of scope for this spec)

Multiplayer, mod support, save-slot multiplexing, additional floor archetypes (penthouse, datacenter, archives), seasonal events, cloud sync. Listed for completeness; each gets its own spec when prioritized.

### 22.5 Milestone gate ordering (hard rules)

1. PRQ-00 → PRQ-18 sequenced; no skipping.
2. **Alpha gate** (§19) blocks PRQ-B0.
3. PRQ-B0 → PRQ-B9 sequenced.
4. **Beta gate** (§22.2 DoD) blocks PRQ-RC0.
5. PRQ-RC0 → PRQ-RC7 sequenced.
6. **RC gate** (§22.3 DoD) is ship-ready.

The `.agent-state/directive.md` records all three milestone groups, but only the active milestone's PRQs are unlocked at any time. Promotion between milestones is human-gated.

---

*End of foundation spec.*
