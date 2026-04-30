---
title: Construction Primitives
updated: 2026-04-30
status: current
domain: technical
---

# Construction Primitives

A level is a **bag of construction primitives + a bag of prop placements + a camera rail + a screenplay**. There is no "big level GLB." Every wall, every door, every window, every ceiling tile is an authoring decision with a chosen texture, instantiated from this primitive set.

This doc is the schema reference for the level authoring layer (`docs/spec/levels/01-lobby.md` … `08-boardroom.md`). Each level's **topology** section names primitives by id and quotes texture filenames out of `public/assets/textures/`.

## Coordinate convention

- World-space, right-handed, +Y up, +Z forward (camera-rail direction at level start).
- Cell size: **1 unit = 1 metre**. Floor plates are sized in cells of `4 × 4` metres (one cubicle = one cell).
- Camera height while gliding: `1.6` (eye-line). Combat dwell may dip to `1.2` (crouched-cover) or rise to `1.8` (executive eye-line).

## Texture library on disk

Three texture sources are available. Filenames in level docs are quoted **verbatim** so the level loader can `path.join(TEX_ROOT, filename)`.

| Source | Path | Files |
|---|---|---|
| **Retro doors** | `public/assets/textures/retro/doors/` | 94 PNGs (`T_Door_*.png`) |
| **Retro windows** | `public/assets/textures/retro/windows/` | 120 PNGs (`T_Window_*.png`) |
| **Retro shutters** | `public/assets/textures/retro/shutters/` | 26 PNGs (`T_Shutter_*.png`) |
| **PBR drywall** | `public/assets/textures/drywall/` | `drywall_{AO,Diffuse,nor_gl,Rough}_2k.jpg` |
| **PBR carpet** | `public/assets/textures/carpet/` | `carpet_{AO,Diffuse,nor_gl,Rough}_2k.jpg` |
| **PBR laminate** | `public/assets/textures/laminate/` | `laminate_{AO,Diffuse,nor_gl,Rough}_2k.jpg` |
| **PBR ceiling-tile** | `public/assets/textures/ceiling-tile/` | `ceiling-tile_{AO,Diffuse,nor_gl,Rough}_2k.jpg` |
| **PBR whiteboard** | `public/assets/textures/whiteboard/` | `whiteboard_{AO,Diffuse,nor_gl,Rough}_2k.jpg` |

PBR sets always come as a 4-texture bundle (AO, Diffuse, normal, Roughness). Levels reference a PBR set by its short name (`drywall`, `carpet`, `laminate`, `ceiling-tile`, `whiteboard`); the loader resolves the four files.

Retro PNGs are referenced by exact filename (`T_Door_Wood_012.png`).

## Primitive contract

Every primitive shares these fields:

```ts
interface Primitive {
  id: string;            // unique within the level — referenced by cues
  origin: Vector3;       // world-space anchor (Babylon Vector3)
  yaw: number;           // radians around +Y; 0 = facing +Z
}
```

Anchor convention:
- **Wall / Window / Shutter / Whiteboard / Door** — `origin` is the centre of the bottom edge, on the side facing the camera rail.
- **Floor / Ceiling** — `origin` is the centre of the plate.
- **Pillar** — `origin` is the centre of the bottom face.
- **Prop** — `origin` is the GLB's authored pivot, which is at the base for all `public/assets/models/props/*.glb`.

## Wall

```ts
interface Wall extends Primitive {
  kind: 'wall';
  width: number;         // metres along its facing axis
  height: number;        // metres up
  pbr: 'drywall' | 'whiteboard';
  overlay?: {
    texture: string;     // retro PNG filename, e.g. 'T_Window_Wood_012.png'
    uvOffset?: [number, number];  // 0..1
    uvScale?: [number, number];   // 1 = native PNG aspect
  };
}
```

A wall is a tessellated quad with a PBR base and an optional retro overlay (decals, flyers, posters, hand-painted signage). The drywall PBR is the default; whiteboard PBR is reserved for `Whiteboard` walls (see below).

**Standard wall sizes (cell-aligned):**
- Cubicle wall (half-height): `4 × 1.5`
- Cubicle wall (full): `4 × 2.6`
- Corridor wall: `4 × 3.0`
- Atrium wall: `8 × 6.0`

## Floor

```ts
interface Floor extends Primitive {
  kind: 'floor';
  width: number;         // metres along +X
  depth: number;         // metres along +Z
  pbr: 'carpet' | 'laminate';
}
```

Carpet for cubicle floors, laminate for corridors / lobbies / executive suites. Marble (Lobby, Boardroom) is currently `laminate` with a high-saturation tint applied at material instantiation — author can request a marble PBR set later if visual is unsatisfactory.

## Ceiling

```ts
interface Ceiling extends Primitive {
  kind: 'ceiling';
  width: number;
  depth: number;
  pbr: 'ceiling-tile';
  height: number;        // metres above origin Y; standard 3.0
  emissiveCutouts?: Array<{
    width: number;
    depth: number;
    offset: [number, number];   // x, z offset from ceiling centre
    intensity: number;          // 0..2; standard 0.7 for fluorescent
    color: [number, number, number]; // linear RGB; cool white = (0.95, 1.0, 1.0)
  }>;
}
```

Cutouts are emissive rectangles inside the ceiling-tile PBR — they read as fluorescent fixtures. Exactly one fixture per `4 × 4` cell, except in HR Corridor where every other fixture is dead (cutout omitted) and Boardroom where a single chandelier-equivalent fixture replaces the field.

## Door

```ts
interface Door extends Primitive {
  kind: 'door';
  width: number;         // metres; standard 1.0 (single) or 2.0 (double)
  height: number;        // metres; standard 2.2
  texture: string;       // retro PNG filename
  family: 'metal' | 'painted-metal' | 'rusty' | 'wood' | 'painted-wood'
        | 'double' | 'garage' | 'lift' | 'sliding';
  state: 'closed' | 'open';      // initial state at level start
  swing: 'inward' | 'outward' | 'slide-left' | 'slide-right' | 'rolling';
  hingedOn?: 'left' | 'right';   // for swing doors
  spawnRailId?: string;          // if non-empty, props slide out of this door
}
```

A door is a textured quad cut into a wall (the wall primitive must be authored with the door's footprint omitted). The 94 retro door textures span every family. The `spawnRailId` field cross-references a `SpawnRail` (see below); when the screenplay director plays an `enemy-spawn` cue keyed to this door, the prop slides out along the rail as the door animates open.

## Window

```ts
interface Window extends Primitive {
  kind: 'window';
  width: number;
  height: number;
  texture: string;       // retro PNG, e.g. 'T_Window_GlassBricks_00.png'
  transparent: boolean;  // false = opaque, true = alpha-tested
  emissive?: [number, number, number]; // backlight; e.g. (0.4, 0.5, 0.7) for daylight
}
```

The 120 retro window PNGs cover every family. `T_Window_GlassBricks_*.png` is the canonical HR-frosted-glass texture (HR Corridor); others are environmental decoration (cubicle privacy panels, executive office walls).

## Shutter

```ts
interface Shutter extends Primitive {
  kind: 'shutter';
  width: number;
  height: number;
  texture: string;       // retro PNG, e.g. 'T_Shutter_Wood_010.png'
  state: 'down' | 'up' | 'half';
  spawnRailId?: string;  // shutters can also gate spawn rails
}
```

26 retro shutter PNGs. Used for storefront-style spawn closets (Stairway B's vending alcove, Executive Suites' supply closets) and as window blinds.

## Whiteboard

```ts
interface Whiteboard extends Primitive {
  kind: 'whiteboard';
  width: number;
  height: number;
  pbr: 'whiteboard';     // forced — kept here for primitive-table symmetry
  caption?: string;      // hand-painted overlay text; rendered via dynamic texture
}
```

A whiteboard is a wall with the whiteboard PBR set instead of drywall. The optional `caption` paints text via a runtime dynamic texture (Babylon `DynamicTexture`) for level-specific gallows-humour signage ("Q3 SYNERGY ROADMAP", "REORG: PHASE Δ").

## Pillar

```ts
interface Pillar extends Primitive {
  kind: 'pillar';
  shape: 'square' | 'round';
  size: number;          // square edge length OR round diameter
  height: number;
  pbr: 'drywall' | 'laminate';
}
```

Structural columns. Used for cover (Lobby's two atrium pillars; Open Plan's load-bearing posts). Round in Lobby (marble lobby aesthetic), square elsewhere.

## Prop

```ts
interface Prop extends Primitive {
  kind: 'prop';
  glb: string;           // path under public/assets/models/, e.g. 'props/desk.glb'
  scale?: number;        // uniform; default 1
}
```

A prop is a GLB instance from `public/assets/models/`. Available GLBs:

| Path | Use |
|---|---|
| `props/desk.glb` | Cubicle desk, reception desk, executive desk |
| `props/cabinet-1.glb`, `cabinet-2.glb`, `cabinet-3.glb` | Filing cabinet variants |
| `props/closet.glb` | Spawn-closet structure (paired with a Door primitive) |
| `props/bedside-1.glb`, `bedside-2.glb` | Side tables — repurposed as office side tables |
| `props/staircase-1.glb`, `staircase-2.glb` | Stairway-level core geometry |
| `props/treasure-chest.glb` | (Boardroom Easter egg — see 08-boardroom.md) |
| `traps/trap-1.glb` … `trap-50.glb` | Set-dressing obstacles, cubicle clutter, executive boardroom hardware |

Props are static unless they have a `propAnimId` referenced by a `prop-anim` cue (e.g., the boardroom chandelier swings during Reaper Phase 2).

## Spawn rail

A spawn rail is **not** a primitive — it's a path that props ride. It belongs alongside the camera rail in the level data:

```ts
interface SpawnRail {
  id: string;
  path: Vector3[];              // 2-6 waypoints
  speed: number;                // m/s along the path
  loop: boolean;                // false for one-shot (door pop), true for civilian beats
}
```

The cue list addresses spawn rails by `id`. An `enemy-spawn` cue takes `{ railId, archetype, fireProgram }` and instantiates an enemy prop at `path[0]`, sliding it along at `speed`. When the prop reaches `path[path.length - 1]`, it stops and ticks its fire program in place. The director kills it (HP=0) or ceases it (`cease()`, retreats back along the rail).

Door- and shutter-attached spawn rails always start *inside* the level's "off-stage" volume (behind the wall, past the camera frustum) so the prop is invisible until the door opens.

## Civilian rail

```ts
interface CivilianRail {
  id: string;
  path: Vector3[];
  speed: number;
  archetype: 'intern' | 'consultant' | 'executive';
}
```

Same shape as a spawn rail, but the cue verb is `civilian-spawn`. Civilians never fire. They walk start-to-end and despawn on arrival. Hitting one with player fire is `-500` score.

## Light

```ts
interface Light extends Primitive {
  kind: 'light';
  light: 'point' | 'spot' | 'directional' | 'hemispheric';
  color: [number, number, number];
  intensity: number;
  range?: number;        // point/spot only
  direction?: Vector3;   // spot/directional only
  conicalAngle?: number; // spot only, radians
}
```

Lights are construction primitives, not screenplay events. Static lights are placed once at level construction. Dynamic lighting changes (a flicker, a power-out, a dramatic spot snap) are screenplay cues that toggle / tween light parameters at runtime — see `05-screenplay-language.md` for the `lighting` cue verb.

## Ambience

```ts
interface AmbienceLayer {
  id: string;
  audio: string;          // path under public/assets/audio/ambience/
  volume: number;         // 0..1
  loop: boolean;
}
```

Each level boots with a base ambience layer (`radio-chatter`, `managers-only`, `boots-thump`, `tense-drone`); cues can fade additional layers in/out.

## Authoring guidelines

1. **Never invent a texture filename.** If the asset isn't in `public/assets/textures/`, file a content TODO inline in the level doc instead of referencing a non-existent file.
2. **Cell-align everything.** Floors, walls, ceilings, doors all snap to the 1m grid; cubicles to the 4m grid. Misaligned geometry is a bug.
3. **Reuse aggressively across levels.** A `T_Door_Wood_012` chosen for Open Plan can recur on the same kind of cubicle door in HR Corridor; that visual repetition is the corporate-tower texture.
4. **Spawn rails go behind solid geometry.** A door cue that "pops a manager out" must have its rail entirely on the off-stage side of the wall so nothing is visible before the door opens.
5. **Light count budget per level: ≤32 dynamic lights total.** Most fluorescent fixtures are baked into ceiling-emissive cutouts (free); explicit lights are reserved for mood (HR's flickering office-lamp, Boardroom's chandelier, Stairway C's emergency strip).

---

This schema is the contract between the level authors (writing screenplay docs) and the engine implementers (`src/levels/types.ts` will mirror these interfaces verbatim). When a level doc references a primitive by name and field, the engine knows exactly what to build.
