---
title: Weapon Progression Design
updated: 2026-04-30
status: current
domain: product
---

# Weapon Progression Design

> Pivot from the alpha placeholder weapon table (1 melee + 1 burst + 4 stub weapons) to a **classic FPS progression loop** with 6 real-gun viewmodels renamed to office-themed slugs. Ground-up rewrite of `public/content/weapons.json` plus tier-stat upgrades, drop tables, and a workbench UI.

## Goal

Replace the office-flavored melee+stub weapons with a real-gun roster that:

1. **Each weapon is a real FPS gun** (AK-47, shotgun, MAC-10, bazooka, flamethrower, MGD-PM9) reskinned to office vocabulary by name only.
2. **Tier-stat upgrades** — every weapon has T1/T2/T3 stat curves; coffee/binder-clips/donuts/briefcases convert to upgrade currency at a workbench.
3. **Classic progression loop** — start with one weapon, find others on the floor, upgrade at workbench, swap when better gear drops. No melee starter.

## Non-goals (post-1.0)

- Mod slots (suppressor / scope / extended mag) — defer; the GLB has parts but wiring drops/UI is its own scope.
- Weapon dual-wielding.
- Per-weapon reload animations beyond the existing fire cooldown timer.
- Per-weapon viewmodel hand poses (single grip pose for now; finger-curl per weapon is a polish pass).

## Roster

| Slug | Display name | Real-gun GLB | Kind | Tier-1 role |
|---|---|---|---|---|
| `staple-rifle` | Staple Rifle | `weapon-ak47.glb` | hitscan | All-rounder; starter weapon |
| `binder-blaster` | Binder Blaster | `weapon-shotgun.glb` | hitscan (multi-pellet) | Close-range burst |
| `expense-report-smg` | Expense Report SMG | `weapon-mac10.glb` | hitscan (auto) | Sustained DPS |
| `toner-cannon` | Toner Cannon | `weapon-bazooka.glb` | projectile | AOE; rare |
| `compliance-incinerator` | Compliance Incinerator | `weapon-flamethrower.glb` | hitscan (cone) | Sustained AOE |
| `severance-special` | Severance Special | `weapon-mgd-pm9.glb` | projectile | Heavy single-shot |

**Starter loadout:** `staple-rifle` only, T1, 30 ammo. Other weapons are picked up on the floor — see drop progression.

### Why these mappings

- **AK = Staple Rifle.** All-rounder gun maps to the entry weapon with the most universal name, and "staple" carries the office stapler legacy from the spec.
- **Shotgun = Binder Blaster.** Binders go *thwack*; shotguns go *thwack*. Multi-pellet matches the cluster-of-rings imagery.
- **MAC-10 = Expense Report SMG.** Quick-fire bureaucratic spray. Compact GLB.
- **Bazooka = Toner Cannon.** Heavy projectile; "toner cannon" already in the spec roster.
- **Flamethrower = Compliance Incinerator.** Burning paperwork is a thing. Sustained cone matches.
- **MGD PM-9 = Severance Special.** Heavy single-shot pistol. "Severance" cuts you loose; finishing-blow vibe.

## Stats (T1 → T3 curves)

Each tier multiplies T1 stats. Damage and ammo cap go up; cooldown goes down; spread shrinks slightly.

| Weapon | Kind | T1 dmg | T1 ammoCap | T1 cooldownMs | T1 range | T1 spreadDeg | Special |
|---|---|---|---|---|---|---|---|
| `staple-rifle` | hitscan | 8 | 30 | 120 | 18 | 4 | auto-fire (single bullets) |
| `binder-blaster` | hitscan | 6 ×6pellets | 8 | 800 | 8 | 12 | pellet-spread |
| `expense-report-smg` | hitscan | 5 | 32 | 80 | 14 | 6 | high cyclic rate |
| `toner-cannon` | projectile | 75 (AOE r=2.5u) | 4 | 1500 | 14 | 0 | splash damage |
| `compliance-incinerator` | hitscan | 4/tick | 50 (fuel) | 60 | 6 | 8 | 60° cone, dot |
| `severance-special` | projectile | 35 | 12 | 600 | 16 | 2 | guaranteed crit on weak point |

**Tier multipliers (uniform across roster):**

| Tier | Damage × | Ammo cap × | Cooldown × | Spread × |
|---|---|---|---|---|
| T1 | 1.00 | 1.00 | 1.00 | 1.00 |
| T2 | 1.40 | 1.50 | 0.85 | 0.80 |
| T3 | 1.85 | 2.10 | 0.70 | 0.55 |

Range is fixed per weapon. AOE radius for `toner-cannon` scales with damage.

## Drop progression

Per spec §10 threat tiers, the spawn director picks weapons for floor drops with a weighted table.

| Threat tier | Floor # (approx) | Drop pool |
|---|---|---|
| `low` (0..2) | 1–3 | `staple-rifle` T1 (re-spawn for ammo), `expense-report-smg` T1 |
| `police` (2..4) | 3–6 | + `binder-blaster` T1, `staple-rifle` T2 |
| `hitman` (4..5) | 6–9 | + `severance-special` T1, `expense-report-smg` T2 |
| `swat` (5..8) | 9–14 | + `toner-cannon` T1, `compliance-incinerator` T1, T2 of any |
| `squad` (8+) | 15+ | + T3 of any (rare) |

**Drop frequency:** ~0.3 weapons per floor early, ~0.6 mid-game, ~1.0 late. Each floor's drop is deterministic from `${seed}::weapon-drop::floor-${N}`.

**Pickup:** taps the weapon GLB on the floor → swaps the active weapon slot's contents. Old weapon stays on the floor (deterministic respawn means revisits get the same item back).

## Upgrade economy

**Workbench:** every 5th floor (5, 10, 15, …) places a `WorkbenchEntity` near the down-door. Tap-and-hold → radial → "Upgrade".

**Upgrade cost (per tier-up):**

| From → To | Coffee | Binder clips | Donuts | Briefcases |
|---|---|---|---|---|
| T1 → T2 | 4 | 8 | 0 | 0 |
| T2 → T3 | 8 | 12 | 4 | 1 |

**Pickup → currency conversion** (1:1 for now; M5 polish can introduce ratios):

| Pickup | Currency slug |
|---|---|
| Coffee | `coffee` (1 coffee = 1 unit) |
| Binder clips | `binder-clips` |
| Donut | `donut` |
| Briefcase | `briefcase` |

The pickup-applied health/armor/ammo effects stay (per `applyPickup` today); the *count* of each is also tallied as upgrade currency. Spend at the workbench.

## Architecture

### Data shape

`public/content/weapons.json` rewrites to:

```json
{
  "weapons": [
    {
      "slug": "staple-rifle",
      "name": "Staple Rifle",
      "kind": "hitscan",
      "viewmodel": { "glb": "weapon-ak47.glb", "gripSlug": "ak47" },
      "audioCueOnFire": "weapon-staple-rifle-fire",
      "tiers": {
        "T1": { "damage": 8,    "ammoCap": 30, "cooldownMs": 120, "range": 18, "spreadDeg": 4 },
        "T2": { "damage": 11.2, "ammoCap": 45, "cooldownMs": 102, "range": 18, "spreadDeg": 3.2 },
        "T3": { "damage": 14.8, "ammoCap": 63, "cooldownMs": 84,  "range": 18, "spreadDeg": 2.2 }
      }
    }
  ]
}
```

`tiers.T2/T3` are pre-computed (not derived at runtime) so a balance pass adjusts the JSON directly without re-running multipliers in code.

### Type changes (`src/content/weapons.ts`)

- Add `Tier = 'T1' | 'T2' | 'T3'`.
- Add `WeaponTierStats { damage, ammoCap, cooldownMs, range, spreadDeg }`.
- Each weapon type gets `tiers: Record<Tier, WeaponTierStats>` instead of inline `damage` / `range` / etc.
- The `Equipped` ECS component (currently tracks `slug + ammo`) gains `tier: Tier`.
- A helper `weaponStatsFor(weapon, tier): WeaponTierStats` collapses lookup.

### Drop spawning

- New module `src/combat/weaponDrops.ts`: `pickWeaponDrop(seed, floor, threatTier): WeaponDrop | null`.
- `Game.tsx` reads it on every floor entry; if non-null, mounts a `<WeaponPickup>` at a deterministic walkable cell near the down-door.
- `WeaponPickup` (new R3F) renders the GLB rotating slowly, with a glow tint per tier (T1 white, T2 amber, T3 cyan).
- On player proximity (≤ 1.2u), tap → swap. Old weapon stays at that cell as a re-pickup.

### Workbench

- New `WorkbenchEntity` (R3F) — a desk-prop GLB with a glowing terminal mesh on top.
- Mounts on every 5th floor near the down-door.
- Player taps → opens `WorkbenchPanel` (radix Dialog) listing owned weapons + tier-up cost from currency wallet.
- Currency wallet is a koota frame state component `WeaponCurrency { coffee, binderClips, donuts, briefcases }` — incremented on each pickup.

### Viewmodel

- Implementation continues from in-flight task #102.
- `<FpsViewmodel>` reads `currentWeaponSlug + currentTier` from `Equipped`, looks up `weapon.viewmodel.glb`, mounts via the grip transform.
- Tier upgrades don't change the viewmodel GLB (same gun, just better stats); a future polish pass can add tier-tinted material overrides.

## Migration

`Equipped` schema migration: existing alpha saves have weapons `'stapler' + 'three-hole-punch'`. Migration:

| Old slug | New slug | Tier |
|---|---|---|
| `stapler` | `staple-rifle` | T1 |
| `three-hole-punch` | `expense-report-smg` | T1 |
| `letter-opener`, `whiteboard-marker` | drop (no equivalent) | — |
| `toner-cannon` | `toner-cannon` (kept slug) | T1 |
| `fax-machine` | `compliance-incinerator` | T1 |

Migration runs once when `loadWeapons()` first sees a save with the old shape. Add `world_meta.weapon_schema_version` (default 0 = old, current = 1).

## Testing

- Unit (`src/content/weapons.test.ts`): every weapon has all 3 tiers + finite stats; tier multipliers match the documented curves.
- Unit (`src/combat/weaponDrops.test.ts`): drop table is deterministic for a given (seed, floor, threat); higher tiers don't appear before their threat threshold.
- Browser (`tests/browser/`): mounting `<FpsViewmodel slug='staple-rifle' tier='T1'/>` shows the AK GLB without errors; swapping `tier='T2'` doesn't re-mount the GLB.
- E2E (`@golden`): pick up a weapon on floor 2 → swap to it → fire → ammo decrements → reach workbench on floor 5 → upgrade → fire ratio reflects new cooldown.

## Out of scope

- Mod-slot system (post-1.0).
- Weapon-pickup voice barks ("New gun!" lines).
- Tier-tinted material override (T2 amber / T3 cyan emissive ring).
- Weapon-skin variants beyond the GLBs we have.
- Inventory UI showing all owned weapons (alpha = single equipped slot; M5 adds the dual-slot loadout).

## Risk + mitigations

- **Balance.** Six guns × three tiers = 18 stat tuples. Mitigation: ship the multiplier-derived T2/T3 in JSON so balance passes are JSON-only edits, no recompile.
- **Save migration.** Players on alpha save format have to migrate without losing progress. Mitigation: `weapon_schema_version` gate; old slugs map to closest new slug.
- **GLB readability.** The bazooka and flamethrower are huge in the existing extraction; viewmodel may dominate the screen. Mitigation: per-weapon scale + position offsets in `viewmodel-grips.json` (already shipped) — tune visually after the first mount.
- **Workbench scope creep.** Could grow into a "shop" UI. Mitigation: rigid scope — workbench shows owned-weapon tier upgrades only, no buying, no selling, no mods.
