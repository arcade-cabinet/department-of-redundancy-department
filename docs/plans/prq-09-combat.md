# PRQ-09: Combat — Weapons, Projectiles, HUD, Pickups

**Status:** queued

**Blocked by:** PRQ-08.

## Goal

Implement the alpha weapon set (Stapler melee + Three-Hole Punch ranged), projectile lifecycle (Rapier kinematic + BVH hitscan), pickup mechanics (binder-clips ammo, coffee heal, donut overheal, briefcase armor), and the polished combat HUD (HP, ammo, weapon icon, threat strip, floor stamp). Player can now actively kill managers using equipped weapons rather than dev-mode instakill.

## Spec reference

§ 0 The DOOM surface (weapons, pickups), § 11 Brand HUD chrome (§11.4), § 19 §19.2 (gameplay bar — at least one weapon and one ranged weapon).

## Success criteria

- `weapons.json` declares Stapler (melee, infinite, 12 dmg, 0.4s cooldown) and Three-Hole Punch (3-round burst, 8 dmg/round, range 16u, paper projectile, 25 ammo cap).
- Tap-engage on enemy with current weapon equipped fires weapon at appropriate cadence; auto-fire while target in LOS; cancel on tap-cancel/out-of-range.
- Three-Hole Punch projectiles are Rapier kinematic with BVH raycast for hit detection; 6u/s muzzle velocity; 1s lifetime; visible white-paper trail via drei `<Trail/>`.
- Stapler is hitscan-melee at 1.5u range; player must be facing within 30°.
- Pickups spawn on enemy death (50% binder-clips +5 ammo / 50% coffee +20 HP); donut and briefcase appear in supply closets via generator.
- Pickup tap-or-walk-over consumes the world entity and applies the effect.
- HUD: HP bar (approval-green), ammo counter (toner-cyan, Departure Mono numerals), weapon icon (current slot), threat strip (top-right, redacted-document fill, auditor-red), floor stamp (top-left, "FLOOR 003").
- Crosshair: 4px hairline cross only when target in range; otherwise hidden.
- Browser test covers projectile spawn + collision; node test covers weapon math.
- E2E: kill 3 managers using actual weapons (no dev-mode), confirms ammo decrement + HP refill on coffee pickup.

## Task breakdown

### T1: Weapons table + content loader

**Files:** `public/content/weapons.json`, `src/content/weapons.ts`, `src/content/weapons.test.ts`.

JSON schema (zod-validated) per weapon: `{ slug, kind: 'melee'|'projectile'|'hitscan', damage, range, cooldownMs, ammoCap?, projectileSpeed?, spreadDeg, audioCueOnFire }`. Two entries for alpha.

**Acceptance:** loader returns typed weapons; validation throws on missing fields.

### T2: Equipped-weapon component + slot

**Files:** `src/ecs/components/Equipped.ts`, `src/combat/equip.ts`.

Player has 8-slot quickbar (alpha: only slots 1+2 used); `Equipped.current` is the active slot index. Number keys 1–8 (desktop) and tap-icon (mobile) switch.

**Acceptance:** node test: switch slots, current weapon updates.

### T3: Stapler melee path

**Files:** `src/combat/melee.ts`.

On `tap-engage(enemy)` with stapler equipped: face target; if within 1.5u and angle <30° → apply damage; else trigger walk-then-melee (path to within 1.4u, then swing).

**Acceptance:** node test: damage applied at range 1.4u; not at 1.6u.

### T4: Three-Hole Punch projectile path

**Files:** `src/combat/projectiles.ts`, `src/render/effects/PaperProjectile.tsx`.

Spawn 3 Rapier kinematic projectiles (one per burst at 80ms intervals), each carrying `damage`, `owner`, `lifetime`. Tick: BVH raycast forward each frame; on hit-actor → apply damage + despawn + spawn paper-shred particles; on lifetime expire or hit-world → despawn + paper-shred.

**Acceptance:** browser test: spawn one projectile aimed at a manager → manager Health decreases; projectile despawns.

### T5: Auto-engage controller

**Files:** `src/combat/autoEngage.ts`.

When `tap-engage(enemyId)` fired: set Player.engageTarget; while target alive + in LOS + in range: fire weapon at cadence. On any of those false: clear engageTarget. Re-tap-engage same enemy = no-op; tap elsewhere = cancel.

**Acceptance:** node test: engage → 3 fires across 1.5s; lose LOS → no further fires.

### T6: Pickups

**Files:** `src/combat/pickups.ts`, `src/render/effects/Pickup.tsx`, `src/world/generator/floor.ts` (add supply-closet contents).

Pickup entities: `binder-clips` (sprite-on-floor, +5 ammo), `coffee` (mug GLB from props pack if available, else cube placeholder, +20 HP), `donut` (cube with toner-cyan tint, +20 overheal cap +120), `briefcase` (cube placeholder, +25 armor). Walk-over OR tap consumes. Death-drop hook from PRQ-08 spawner now drops binder-clips/coffee.

**Acceptance:** browser test: spawn pickup, walk over → effect applied + entity removed.

### T7: Combat HUD chrome

**Files:** `src/ui/chrome/HUD.tsx`, `src/ui/chrome/{HpBar,AmmoCounter,WeaponIcon,ThreatStrip,FloorStamp,Crosshair}.tsx`.

Each component is a Radix-styled fixed-position div consuming koota state. Threat strip animates fill via Framer Motion spring on threat change. Floor stamp shows "FLOOR 003" in Departure Mono. Crosshair is conditionally rendered based on raycast result of camera-forward vs LOS.

**Acceptance:** browser snapshot test of HUD at known state passes.

### T8: Audio cue stubs

**Files:** `src/combat/sfx-stubs.ts`.

Emits `audio:fire(slug)` events; full audio wiring lands in PRQ-15.

**Acceptance:** events emitted on each fire.

### T9: E2E full combat

**Files:** `e2e/combat-real.spec.ts` (`@golden`).

Boot → equip stapler → walk to manager → tap-engage → manager dies → pickup spawns → walk over → ammo +5; equip Three-Hole Punch → kill 2nd manager at range; coffee pickup → HP refilled.

**Acceptance:** green.

### T10: PR + merge

PR: `feat(combat): weapons + projectiles + pickups + HUD (PRQ-09)`. Squash-merge after `validate-deployed` green.

## Notes

Full weapon roster (Letter Opener, Toner Cannon, Fax Machine, Whiteboard Marker) lands in PRQ-B0. Alpha proves the loop with two weapons.
