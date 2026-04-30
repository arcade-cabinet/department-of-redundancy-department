# Weapon Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder weapon table with a 6-gun real-FPS roster (office-named) that supports T1/T2/T3 stat upgrades, drops on floors keyed off threat tier, and tier-up exchanges at workbench cubicles every 5th floor.

**Architecture:** Pure-data weapon JSON gets a `tiers: { T1, T2, T3 }` block per weapon; runtime resolves stats via `weaponStatsFor(weapon, tier)`. The `Equipped` component gains a per-slot `tier` field. New koota-style currency wallet tallies pickups. New R3F mounts: `<WeaponPickup>` (floor drops) and `<WorkbenchEntity>` (every 5 floors). The `<FpsViewmodel>` work in flight (task #102) consumes the new shape directly.

**Tech Stack:** TypeScript / R3F / drei `useGLTF` / koota frame state / Vitest 4 / Playwright. JSON content + multiplier-derived tier curves baked into JSON for balance-pass simplicity.

**Compliance Incinerator (resolved per user 2026-04-30):** Lands as a **true DOT** — fire applies a per-enemy burn timer (4 dmg/tick, 5 ticks at 200ms intervals = 20 burn dmg per hit) on top of a smaller direct hit (4 dmg/tick of contact via the cone hitscan at 60ms cooldown). Stacks refresh duration. Implementation in Task 16.

**Dev Room (added per user 2026-04-30):** A bounded, walled room accessible via `?dev=1` URL flag bypassing the normal floor system. Contents: weapon-rack tables (1 of each weapon + tier-cycle button), target dummy on the back wall (registers hits + DPS readout), 1 of each enemy variant (paused until activated), and a set of wall decorations as the test for wall-mounted prop spawning. Lives in `src/world/devroom/` and mounts when `?dev=1` is set; the normal `<World>` is bypassed. Implementation in Tasks 17-20.

**Debug HUD (added per user 2026-04-30):** Gated on `?dev=1`. Shows draw-call count + frame ms + camera position + active weapon stats + DPS readout from the dev-room target. Toggle visibility with backtick. Implementation in Task 21.

---

## File Structure

| File | Responsibility |
|---|---|
| `public/content/weapons.json` | Six-gun roster with `tiers: {T1,T2,T3}` blocks, viewmodel bindings |
| `src/content/weapons.ts` | Type rewrite: `Tier`, `WeaponTierStats`, `weaponStatsFor()`, validator updates |
| `src/content/weapons.test.ts` | New: every weapon has 3 tiers; multiplier curves match spec |
| `src/ecs/components/Equipped.ts` | Add `tier: Tier` to `EquippedSlot`; new `setSlotTier()`; backward-compat default `'T1'` |
| `src/ecs/components/Equipped.test.ts` | Updated assertions for tier field |
| `src/ecs/components/WeaponCurrency.ts` | New: `{ coffee, binderClips, donuts, briefcases }` tally |
| `src/ecs/components/WeaponCurrency.test.ts` | New: add/spend/canAfford |
| `src/combat/weaponDrops.ts` | New: `pickWeaponDrop(seed, floor, threatTier): WeaponDrop \| null` |
| `src/combat/weaponDrops.test.ts` | New: deterministic drops; tier gating by threat |
| `src/combat/upgrade.ts` | New: `upgradeCost(currentTier, targetTier)`, `canAfford(wallet, cost)` |
| `src/combat/upgrade.test.ts` | New: cost table from spec |
| `src/combat/WeaponPickup.tsx` | New R3F: floor-mounted weapon GLB, rotating, glowing per tier; collect on proximity |
| `src/world/workbench/WorkbenchEntity.tsx` | New R3F: workbench desk + glowing terminal; tap → opens panel |
| `src/world/workbench/workbenchSpawn.ts` | New: `isWorkbenchFloor(n): boolean` (every 5th) + spawn position helper |
| `src/world/workbench/workbenchSpawn.test.ts` | New: floor multiples + position deterministic |
| `app/views/WorkbenchPanel.tsx` | New radix Dialog: list owned weapons, show upgrade cost, spend currency |
| `src/db/repos/weapons.ts` | Add migration helper `migrateAlphaWeaponSlugs(eq): Equipped` |
| `src/db/repos/weapons.test.ts` | Add migration test |
| `src/db/migrations/0003_weapon_schema.sql` | New: `world_meta.weapon_schema_version` column default 0 |
| `app/views/Game.tsx` | Wire `WeaponCurrency`, mount `<WeaponPickup>` per floor drop, mount `<WorkbenchEntity>` on workbench floors, render `<WorkbenchPanel>`, route `?dev=1` to `<DevRoom>` |
| `docs/superpowers/specs/2026-04-29-dord-foundation-design.md` | Update §0 weapon-table summary to point at the new spec |
| `src/combat/burn.ts` | New: per-enemy burn timer state + tick — applied by the Compliance Incinerator |
| `src/combat/burn.test.ts` | New: stack/refresh/expire/damage-per-tick |
| `src/world/devroom/DevRoom.tsx` | New R3F: bounded walled room mounted when `?dev=1` |
| `src/world/devroom/WeaponRack.tsx` | New R3F: a desk + a weapon GLB on it; tap to pick up at current tier |
| `src/world/devroom/TargetDummy.tsx` | New R3F: wall-mounted target with DPS counter (writes to `__dord.devDps`) |
| `src/world/devroom/wallDecor.ts` | New: deterministic placement helpers for wall-mounted props (used by both DevRoom + future cubicle decor) |
| `src/world/devroom/wallDecor.test.ts` | New: placement math (wall normal direction, surface offset) |
| `src/verify/DevHUD.tsx` | New: dev-only HUD (draw calls / frame ms / weapon stats / DPS / camera pos), toggle on backtick |

The existing in-flight `FpsViewmodel` work (task #102) consumes the new types directly — no separate viewmodel changes here beyond passing `tier` to it.

---

### Task 1: Tier types + viewmodel binding in `src/content/weapons.ts`

**Files:**
- Modify: `src/content/weapons.ts`
- Test: `src/content/weapons.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
// src/content/weapons.test.ts
import { describe, expect, it } from 'vitest';
import { buildWeaponsTable, weaponStatsFor } from './weapons';

const FIXTURE = {
	weapons: [
		{
			slug: 'staple-rifle',
			name: 'Staple Rifle',
			kind: 'hitscan',
			audioCueOnFire: 'staple-rifle-fire',
			viewmodel: { glb: 'weapon-ak47.glb', gripSlug: 'ak47' },
			tiers: {
				T1: { damage: 8, ammoCap: 30, cooldownMs: 120, range: 18, spreadDeg: 4 },
				T2: { damage: 11.2, ammoCap: 45, cooldownMs: 102, range: 18, spreadDeg: 3.2 },
				T3: { damage: 14.8, ammoCap: 63, cooldownMs: 84, range: 18, spreadDeg: 2.2 },
			},
		},
	],
};

describe('weapons table', () => {
	it('parses a tiered weapon', () => {
		const map = buildWeaponsTable(FIXTURE);
		const w = map.get('staple-rifle');
		expect(w).toBeDefined();
		expect(w?.kind).toBe('hitscan');
		expect(w?.tiers.T1.damage).toBe(8);
		expect(w?.tiers.T3.damage).toBe(14.8);
	});

	it('weaponStatsFor returns the requested tier stats', () => {
		const map = buildWeaponsTable(FIXTURE);
		const w = map.get('staple-rifle')!;
		expect(weaponStatsFor(w, 'T2').cooldownMs).toBe(102);
	});

	it('throws if a tier is missing', () => {
		const bad = { weapons: [{ ...FIXTURE.weapons[0], tiers: { T1: FIXTURE.weapons[0].tiers.T1 } }] };
		expect(() => buildWeaponsTable(bad)).toThrow(/T2/);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/content/weapons.test.ts`
Expected: FAIL — `weaponStatsFor` not exported / `tiers` not on type.

- [ ] **Step 3: Rewrite weapon types + validator**

Replace the contents of `src/content/weapons.ts`:

```typescript
export type WeaponKind = 'melee' | 'projectile' | 'hitscan';
export type Tier = 'T1' | 'T2' | 'T3';

export interface ViewmodelBinding {
	glb: string;
	gripSlug: string;
}

export interface WeaponTierStats {
	damage: number;
	ammoCap: number;
	cooldownMs: number;
	range: number;
	spreadDeg: number;
}

interface WeaponBase {
	slug: string;
	name: string;
	kind: WeaponKind;
	audioCueOnFire: string;
	viewmodel?: ViewmodelBinding;
	tiers: Record<Tier, WeaponTierStats>;
}

interface MeleeWeapon extends WeaponBase {
	kind: 'melee';
	facingMaxDeg: number;
}

interface ProjectileWeapon extends WeaponBase {
	kind: 'projectile';
	projectileSpeed: number;
	burstCount: number;
	burstIntervalMs: number;
	projectileLifetimeMs: number;
	splashRadius?: number;
}

interface HitscanWeapon extends WeaponBase {
	kind: 'hitscan';
	pelletCount?: number; // shotgun
	coneDeg?: number;     // flamethrower
}

export type Weapon = MeleeWeapon | ProjectileWeapon | HitscanWeapon;

const TIERS: readonly Tier[] = ['T1', 'T2', 'T3'];

export function weaponStatsFor(w: Weapon, tier: Tier): WeaponTierStats {
	const stats = w.tiers[tier];
	if (!stats) throw new Error(`weapon ${w.slug}: missing tier ${tier}`);
	return stats;
}

let weaponsCache: Map<string, Weapon> | null = null;
let pending: Promise<Map<string, Weapon>> | null = null;

const WEAPONS_URL = '/content/weapons.json';

export async function loadWeapons(url: string = WEAPONS_URL): Promise<Map<string, Weapon>> {
	if (weaponsCache) return weaponsCache;
	if (pending) return pending;
	pending = (async () => {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`weapons.json fetch failed: ${res.status}`);
		const json = (await res.json()) as { weapons?: unknown };
		const map = buildWeaponsTable(json);
		weaponsCache = map;
		return map;
	})();
	pending.catch(() => { pending = null; });
	return pending;
}

export function buildWeaponsTable(rawJson: unknown): Map<string, Weapon> {
	if (!rawJson || typeof rawJson !== 'object') throw new Error('weapons table: must be an object');
	const root = rawJson as { weapons?: unknown };
	if (!Array.isArray(root.weapons)) throw new Error('weapons table: expected { weapons: [...] }');
	const map = new Map<string, Weapon>();
	for (const raw of root.weapons) {
		const w = validateWeapon(raw);
		map.set(w.slug, w);
	}
	return map;
}

export function _resetWeaponsForTests(): void {
	weaponsCache = null;
	pending = null;
}

function validateWeapon(raw: unknown): Weapon {
	if (!raw || typeof raw !== 'object') throw new Error('weapon: not an object');
	const r = raw as Record<string, unknown>;
	const slug = mustString(r.slug, 'slug');
	const name = mustString(r.name, 'name');
	const kind = mustString(r.kind, 'kind') as WeaponKind;
	const audioCueOnFire = mustString(r.audioCueOnFire, 'audioCueOnFire');
	const viewmodel = parseViewmodel(r.viewmodel);
	const tiers = parseTiers(slug, r.tiers);

	if (kind === 'melee') {
		return {
			slug, name, kind, audioCueOnFire, tiers,
			...(viewmodel && { viewmodel }),
			facingMaxDeg: mustNumber(r.facingMaxDeg, 'facingMaxDeg'),
		};
	}
	if (kind === 'projectile') {
		const out: ProjectileWeapon = {
			slug, name, kind, audioCueOnFire, tiers,
			...(viewmodel && { viewmodel }),
			projectileSpeed: mustNumber(r.projectileSpeed, 'projectileSpeed'),
			burstCount: mustNumber(r.burstCount, 'burstCount'),
			burstIntervalMs: mustNumber(r.burstIntervalMs, 'burstIntervalMs'),
			projectileLifetimeMs: mustNumber(r.projectileLifetimeMs, 'projectileLifetimeMs'),
		};
		if (typeof r.splashRadius === 'number') out.splashRadius = r.splashRadius;
		return out;
	}
	if (kind === 'hitscan') {
		const out: HitscanWeapon = {
			slug, name, kind, audioCueOnFire, tiers,
			...(viewmodel && { viewmodel }),
		};
		if (typeof r.pelletCount === 'number') out.pelletCount = r.pelletCount;
		if (typeof r.coneDeg === 'number') out.coneDeg = r.coneDeg;
		return out;
	}
	throw new Error(`unknown weapon kind: ${String(kind)}`);
}

function parseTiers(slug: string, raw: unknown): Record<Tier, WeaponTierStats> {
	if (!raw || typeof raw !== 'object') throw new Error(`weapon ${slug}: tiers must be object`);
	const r = raw as Record<string, unknown>;
	const out: Partial<Record<Tier, WeaponTierStats>> = {};
	for (const t of TIERS) {
		if (!(t in r)) throw new Error(`weapon ${slug}: missing tier ${t}`);
		out[t] = parseTierStats(slug, t, r[t]);
	}
	return out as Record<Tier, WeaponTierStats>;
}

function parseTierStats(slug: string, tier: Tier, raw: unknown): WeaponTierStats {
	if (!raw || typeof raw !== 'object') throw new Error(`weapon ${slug}.${tier}: not object`);
	const r = raw as Record<string, unknown>;
	return {
		damage: mustNumber(r.damage, `${slug}.${tier}.damage`),
		ammoCap: mustNumber(r.ammoCap, `${slug}.${tier}.ammoCap`),
		cooldownMs: mustNumber(r.cooldownMs, `${slug}.${tier}.cooldownMs`),
		range: mustNumber(r.range, `${slug}.${tier}.range`),
		spreadDeg: mustNumber(r.spreadDeg, `${slug}.${tier}.spreadDeg`),
	};
}

function parseViewmodel(raw: unknown): ViewmodelBinding | undefined {
	if (raw === undefined || raw === null) return undefined;
	if (typeof raw !== 'object') throw new Error('weapon.viewmodel: must be object');
	const r = raw as Record<string, unknown>;
	return {
		glb: mustString(r.glb, 'viewmodel.glb'),
		gripSlug: mustString(r.gripSlug, 'viewmodel.gripSlug'),
	};
}

function mustString(v: unknown, field: string): string {
	if (typeof v !== 'string' || v.length === 0) throw new Error(`weapon.${field}: expected non-empty string`);
	return v;
}

function mustNumber(v: unknown, field: string): number {
	if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`weapon.${field}: expected finite number`);
	return v;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/content/weapons.test.ts && pnpm typecheck`
Expected: 3 passing, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/content/weapons.ts src/content/weapons.test.ts
git commit -m "feat(weapons): tier types + tiered weapon validator"
```

---

### Task 2: New weapons.json roster

**Files:**
- Modify: `public/content/weapons.json`

- [ ] **Step 1: Write the failing test**

```typescript
// src/content/weapons.test.ts (append)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('shipped weapons.json', () => {
	const json = JSON.parse(readFileSync(resolve('public/content/weapons.json'), 'utf-8'));
	const map = buildWeaponsTable(json);

	it.each([
		'staple-rifle',
		'binder-blaster',
		'expense-report-smg',
		'toner-cannon',
		'compliance-incinerator',
		'severance-special',
	])('has weapon %s with all 3 tiers', (slug) => {
		const w = map.get(slug);
		expect(w).toBeDefined();
		expect(w!.tiers.T1).toBeDefined();
		expect(w!.tiers.T2).toBeDefined();
		expect(w!.tiers.T3).toBeDefined();
	});

	it('tier multipliers approximately match spec curves', () => {
		const w = map.get('staple-rifle')!;
		expect(w.tiers.T2.damage / w.tiers.T1.damage).toBeCloseTo(1.40, 2);
		expect(w.tiers.T3.ammoCap / w.tiers.T1.ammoCap).toBeCloseTo(2.10, 1);
		expect(w.tiers.T2.cooldownMs / w.tiers.T1.cooldownMs).toBeCloseTo(0.85, 2);
	});

	it('every weapon has a viewmodel binding', () => {
		for (const w of map.values()) {
			expect(w.viewmodel).toBeDefined();
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/content/weapons.test.ts -t "shipped"`
Expected: FAIL — old weapons.json has different slugs and no `tiers` blocks.

- [ ] **Step 3: Rewrite `public/content/weapons.json`**

Replace entire file with:

```json
{
	"weapons": [
		{
			"slug": "staple-rifle",
			"name": "Staple Rifle",
			"kind": "hitscan",
			"audioCueOnFire": "staple-rifle-fire",
			"viewmodel": { "glb": "weapon-ak47.glb", "gripSlug": "ak47" },
			"tiers": {
				"T1": { "damage": 8, "ammoCap": 30, "cooldownMs": 120, "range": 18, "spreadDeg": 4 },
				"T2": { "damage": 11.2, "ammoCap": 45, "cooldownMs": 102, "range": 18, "spreadDeg": 3.2 },
				"T3": { "damage": 14.8, "ammoCap": 63, "cooldownMs": 84, "range": 18, "spreadDeg": 2.2 }
			}
		},
		{
			"slug": "binder-blaster",
			"name": "Binder Blaster",
			"kind": "hitscan",
			"audioCueOnFire": "binder-blaster-fire",
			"viewmodel": { "glb": "weapon-shotgun.glb", "gripSlug": "shotgun" },
			"pelletCount": 6,
			"tiers": {
				"T1": { "damage": 6, "ammoCap": 8, "cooldownMs": 800, "range": 8, "spreadDeg": 12 },
				"T2": { "damage": 8.4, "ammoCap": 12, "cooldownMs": 680, "range": 8, "spreadDeg": 9.6 },
				"T3": { "damage": 11.1, "ammoCap": 17, "cooldownMs": 560, "range": 8, "spreadDeg": 6.6 }
			}
		},
		{
			"slug": "expense-report-smg",
			"name": "Expense Report SMG",
			"kind": "hitscan",
			"audioCueOnFire": "expense-report-smg-fire",
			"viewmodel": { "glb": "weapon-mac10.glb", "gripSlug": "mac10" },
			"tiers": {
				"T1": { "damage": 5, "ammoCap": 32, "cooldownMs": 80, "range": 14, "spreadDeg": 6 },
				"T2": { "damage": 7, "ammoCap": 48, "cooldownMs": 68, "range": 14, "spreadDeg": 4.8 },
				"T3": { "damage": 9.25, "ammoCap": 67, "cooldownMs": 56, "range": 14, "spreadDeg": 3.3 }
			}
		},
		{
			"slug": "toner-cannon",
			"name": "Toner Cannon",
			"kind": "projectile",
			"audioCueOnFire": "toner-cannon-fire",
			"viewmodel": { "glb": "weapon-bazooka.glb", "gripSlug": "bazooka" },
			"projectileSpeed": 9,
			"burstCount": 1,
			"burstIntervalMs": 0,
			"projectileLifetimeMs": 1500,
			"splashRadius": 2.5,
			"tiers": {
				"T1": { "damage": 75, "ammoCap": 4, "cooldownMs": 1500, "range": 14, "spreadDeg": 0 },
				"T2": { "damage": 105, "ammoCap": 6, "cooldownMs": 1275, "range": 14, "spreadDeg": 0 },
				"T3": { "damage": 138.75, "ammoCap": 8, "cooldownMs": 1050, "range": 14, "spreadDeg": 0 }
			}
		},
		{
			"slug": "compliance-incinerator",
			"name": "Compliance Incinerator",
			"kind": "hitscan",
			"audioCueOnFire": "compliance-incinerator-fire",
			"viewmodel": { "glb": "weapon-flamethrower.glb", "gripSlug": "flamethrower" },
			"coneDeg": 60,
			"tiers": {
				"T1": { "damage": 4, "ammoCap": 50, "cooldownMs": 60, "range": 6, "spreadDeg": 8 },
				"T2": { "damage": 5.6, "ammoCap": 75, "cooldownMs": 51, "range": 6, "spreadDeg": 6.4 },
				"T3": { "damage": 7.4, "ammoCap": 105, "cooldownMs": 42, "range": 6, "spreadDeg": 4.4 }
			}
		},
		{
			"slug": "severance-special",
			"name": "Severance Special",
			"kind": "projectile",
			"audioCueOnFire": "severance-special-fire",
			"viewmodel": { "glb": "weapon-mgd-pm9.glb", "gripSlug": "mgd-pm9" },
			"projectileSpeed": 14,
			"burstCount": 1,
			"burstIntervalMs": 0,
			"projectileLifetimeMs": 1200,
			"tiers": {
				"T1": { "damage": 35, "ammoCap": 12, "cooldownMs": 600, "range": 16, "spreadDeg": 2 },
				"T2": { "damage": 49, "ammoCap": 18, "cooldownMs": 510, "range": 16, "spreadDeg": 1.6 },
				"T3": { "damage": 64.75, "ammoCap": 25, "cooldownMs": 420, "range": 16, "spreadDeg": 1.1 }
			}
		}
	]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/content/weapons.test.ts && pnpm typecheck`
Expected: all weapons.test.ts tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/content/weapons.json src/content/weapons.test.ts
git commit -m "feat(weapons): six-gun roster with T1/T2/T3 tier curves"
```

---

### Task 3: `Equipped` per-slot tier field

**Files:**
- Modify: `src/ecs/components/Equipped.ts`
- Test: `src/ecs/components/Equipped.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/ecs/components/Equipped.test.ts`:

```typescript
import { currentTier, freshEquipped, setSlot, setSlotTier, type Tier } from './Equipped';

describe('Equipped tier', () => {
	it('defaults to T1 when not specified', () => {
		const eq = setSlot(freshEquipped(), 0, 'staple-rifle', 30);
		expect(currentTier(eq)).toBe('T1');
	});

	it('setSlotTier updates the active slot tier', () => {
		let eq = setSlot(freshEquipped(), 0, 'staple-rifle', 30);
		eq = setSlotTier(eq, 0, 'T2');
		expect(currentTier(eq)).toBe('T2');
	});

	it('setSlotTier is a no-op for an empty slot', () => {
		const eq = setSlotTier(freshEquipped(), 3, 'T2');
		expect(eq.slots[3]?.slug).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ecs/components/Equipped.test.ts -t "tier"`
Expected: FAIL — `setSlotTier` / `currentTier` not exported.

- [ ] **Step 3: Add tier to Equipped**

Edit `src/ecs/components/Equipped.ts`:

Replace `EquippedSlot`:

```typescript
export type Tier = 'T1' | 'T2' | 'T3';

export interface EquippedSlot {
	slug: string | null;
	ammo: number;
	lastFireAt: number;
	tier: Tier;
}

export function emptySlot(): EquippedSlot {
	return { slug: null, ammo: 0, lastFireAt: -Infinity, tier: 'T1' };
}

export function setSlot(eq: Equipped, idx: number, slug: string, ammo: number, tier: Tier = 'T1'): Equipped {
	if (idx < 0 || idx >= QUICKBAR_SIZE) throw new RangeError(`slot index ${idx} OOB`);
	const slots = eq.slots.slice();
	slots[idx] = { slug, ammo, lastFireAt: -Infinity, tier };
	return { ...eq, slots };
}

export function setSlotTier(eq: Equipped, idx: number, tier: Tier): Equipped {
	if (idx < 0 || idx >= QUICKBAR_SIZE) return eq;
	const slot = eq.slots[idx];
	if (!slot?.slug) return eq;
	const slots = eq.slots.slice();
	slots[idx] = { ...slot, tier };
	return { ...eq, slots };
}

export function currentTier(eq: Equipped): Tier {
	return eq.slots[eq.current]?.tier ?? 'T1';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/ecs/components/Equipped.test.ts && pnpm typecheck`
Expected: All Equipped tests pass.

If typecheck flags callers of `setSlot` (Game.tsx, save-loop, etc.), the default `tier='T1'` parameter keeps them compatible — no caller changes required.

- [ ] **Step 5: Commit**

```bash
git add src/ecs/components/Equipped.ts src/ecs/components/Equipped.test.ts
git commit -m "feat(equipped): per-slot tier field, defaults T1"
```

---

### Task 4: WeaponCurrency component

**Files:**
- Create: `src/ecs/components/WeaponCurrency.ts`
- Test: `src/ecs/components/WeaponCurrency.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/ecs/components/WeaponCurrency.test.ts
import { describe, expect, it } from 'vitest';
import { addCurrency, canAfford, freshCurrency, spendCurrency, type CurrencyCost } from './WeaponCurrency';

describe('WeaponCurrency', () => {
	it('starts at zero across all four kinds', () => {
		const c = freshCurrency();
		expect(c).toEqual({ coffee: 0, binderClips: 0, donuts: 0, briefcases: 0 });
	});

	it('addCurrency increments by kind', () => {
		const c = addCurrency(freshCurrency(), 'coffee', 3);
		expect(c.coffee).toBe(3);
		expect(c.binderClips).toBe(0);
	});

	it('canAfford true when wallet >= cost on every key', () => {
		const wallet = { coffee: 5, binderClips: 10, donuts: 0, briefcases: 0 };
		const cost: CurrencyCost = { coffee: 4, binderClips: 8 };
		expect(canAfford(wallet, cost)).toBe(true);
	});

	it('canAfford false when any single kind underfunded', () => {
		const wallet = { coffee: 5, binderClips: 0, donuts: 0, briefcases: 0 };
		const cost: CurrencyCost = { coffee: 4, binderClips: 8 };
		expect(canAfford(wallet, cost)).toBe(false);
	});

	it('spendCurrency deducts each kind in the cost', () => {
		const wallet = { coffee: 5, binderClips: 10, donuts: 0, briefcases: 0 };
		const cost: CurrencyCost = { coffee: 4, binderClips: 8 };
		const next = spendCurrency(wallet, cost);
		expect(next).toEqual({ coffee: 1, binderClips: 2, donuts: 0, briefcases: 0 });
	});

	it('spendCurrency throws when canAfford is false', () => {
		const wallet = freshCurrency();
		expect(() => spendCurrency(wallet, { coffee: 1 })).toThrow(/cannot afford/);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ecs/components/WeaponCurrency.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create the module**

```typescript
// src/ecs/components/WeaponCurrency.ts
/**
 * WeaponCurrency: per-run wallet of pickup-derived upgrade currency.
 * Spec §weapon-progression: every pickup credits both health/ammo
 * (existing applyPickup behavior) AND tallies one unit of its kind
 * here for spending at the workbench.
 */

export interface WeaponCurrency {
	coffee: number;
	binderClips: number;
	donuts: number;
	briefcases: number;
}

export type CurrencyKind = keyof WeaponCurrency;

export type CurrencyCost = Partial<WeaponCurrency>;

export function freshCurrency(): WeaponCurrency {
	return { coffee: 0, binderClips: 0, donuts: 0, briefcases: 0 };
}

export function addCurrency(w: WeaponCurrency, kind: CurrencyKind, n = 1): WeaponCurrency {
	return { ...w, [kind]: w[kind] + n };
}

export function canAfford(wallet: WeaponCurrency, cost: CurrencyCost): boolean {
	for (const [k, v] of Object.entries(cost) as [CurrencyKind, number][]) {
		if ((wallet[k] ?? 0) < v) return false;
	}
	return true;
}

export function spendCurrency(wallet: WeaponCurrency, cost: CurrencyCost): WeaponCurrency {
	if (!canAfford(wallet, cost)) throw new Error('cannot afford cost');
	const out = { ...wallet };
	for (const [k, v] of Object.entries(cost) as [CurrencyKind, number][]) {
		out[k] = out[k] - v;
	}
	return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/ecs/components/WeaponCurrency.test.ts && pnpm typecheck`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/ecs/components/WeaponCurrency.ts src/ecs/components/WeaponCurrency.test.ts
git commit -m "feat(currency): pickup-derived weapon-upgrade wallet"
```

---

### Task 5: Upgrade cost table

**Files:**
- Create: `src/combat/upgrade.ts`
- Test: `src/combat/upgrade.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/combat/upgrade.test.ts
import { describe, expect, it } from 'vitest';
import type { Tier } from '@/ecs/components/Equipped';
import { type CurrencyCost, freshCurrency } from '@/ecs/components/WeaponCurrency';
import { canUpgrade, upgradeCost } from './upgrade';

describe('upgrade', () => {
	it('T1→T2 costs 4 coffee + 8 binder-clips', () => {
		expect(upgradeCost('T1', 'T2')).toEqual({ coffee: 4, binderClips: 8 });
	});

	it('T2→T3 costs 8 coffee + 12 binder-clips + 4 donuts + 1 briefcase', () => {
		expect(upgradeCost('T2', 'T3')).toEqual({
			coffee: 8,
			binderClips: 12,
			donuts: 4,
			briefcases: 1,
		});
	});

	it('returns null for invalid pairs (same tier or downgrade)', () => {
		expect(upgradeCost('T1', 'T1')).toBeNull();
		expect(upgradeCost('T3', 'T2')).toBeNull();
	});

	it('canUpgrade false on empty wallet', () => {
		expect(canUpgrade(freshCurrency(), 'T1', 'T2')).toBe(false);
	});

	it('canUpgrade true when wallet covers cost', () => {
		const wallet = { coffee: 5, binderClips: 10, donuts: 0, briefcases: 0 };
		expect(canUpgrade(wallet, 'T1', 'T2')).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/combat/upgrade.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create the upgrade module**

```typescript
// src/combat/upgrade.ts
import type { Tier } from '@/ecs/components/Equipped';
import { canAfford, type CurrencyCost, type WeaponCurrency } from '@/ecs/components/WeaponCurrency';

const COST_TABLE: Partial<Record<`${Tier}->${Tier}`, CurrencyCost>> = {
	'T1->T2': { coffee: 4, binderClips: 8 },
	'T2->T3': { coffee: 8, binderClips: 12, donuts: 4, briefcases: 1 },
};

export function upgradeCost(from: Tier, to: Tier): CurrencyCost | null {
	return COST_TABLE[`${from}->${to}`] ?? null;
}

export function canUpgrade(wallet: WeaponCurrency, from: Tier, to: Tier): boolean {
	const cost = upgradeCost(from, to);
	if (!cost) return false;
	return canAfford(wallet, cost);
}

export function nextTier(from: Tier): Tier | null {
	if (from === 'T1') return 'T2';
	if (from === 'T2') return 'T3';
	return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/combat/upgrade.test.ts && pnpm typecheck`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/combat/upgrade.ts src/combat/upgrade.test.ts
git commit -m "feat(upgrade): tier-up cost table + canUpgrade gate"
```

---

### Task 6: Drop pool by threat tier

**Files:**
- Create: `src/combat/weaponDrops.ts`
- Test: `src/combat/weaponDrops.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/combat/weaponDrops.test.ts
import { describe, expect, it } from 'vitest';
import { pickWeaponDrop } from './weaponDrops';

describe('weaponDrops', () => {
	it('low tier never drops a high-tier weapon', () => {
		for (let f = 1; f <= 3; f++) {
			const drop = pickWeaponDrop('seed-A', f, 'low');
			if (drop) {
				expect(['staple-rifle', 'expense-report-smg']).toContain(drop.slug);
				expect(drop.tier).toBe('T1');
			}
		}
	});

	it('squad tier can drop T3 weapons', () => {
		// Sample many seeds to trigger the rare T3 path
		let sawT3 = false;
		for (let i = 0; i < 50; i++) {
			const drop = pickWeaponDrop(`seed-${i}`, 16, 'squad');
			if (drop?.tier === 'T3') {
				sawT3 = true;
				break;
			}
		}
		expect(sawT3).toBe(true);
	});

	it('deterministic: same (seed, floor, tier) returns same drop', () => {
		const a = pickWeaponDrop('seed-X', 7, 'hitman');
		const b = pickWeaponDrop('seed-X', 7, 'hitman');
		expect(a).toEqual(b);
	});

	it('returns null when the random roll exceeds the per-tier drop rate', () => {
		// At least one of 100 seeds at low tier should yield null (drop rate ~0.3)
		let sawNull = false;
		for (let i = 0; i < 100; i++) {
			if (!pickWeaponDrop(`null-test-${i}`, 1, 'low')) { sawNull = true; break; }
		}
		expect(sawNull).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/combat/weaponDrops.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create the drop picker**

```typescript
// src/combat/weaponDrops.ts
import type { Tier } from '@/ecs/components/Equipped';
import { createRng } from '@/world/generator/rng';
import type { ThreatTier } from './threat';

export interface WeaponDrop {
	slug: string;
	tier: Tier;
}

interface PoolEntry {
	slug: string;
	tier: Tier;
	weight: number;
}

// Pools keyed off threat tier. Each tier inherits the previous tier's
// pool and adds new rarer/stronger entries (classic FPS escalation).
const POOLS: Record<ThreatTier, PoolEntry[]> = {
	low: [
		{ slug: 'staple-rifle', tier: 'T1', weight: 5 },
		{ slug: 'expense-report-smg', tier: 'T1', weight: 4 },
	],
	police: [
		{ slug: 'staple-rifle', tier: 'T1', weight: 4 },
		{ slug: 'expense-report-smg', tier: 'T1', weight: 4 },
		{ slug: 'binder-blaster', tier: 'T1', weight: 3 },
		{ slug: 'staple-rifle', tier: 'T2', weight: 1 },
	],
	hitman: [
		{ slug: 'staple-rifle', tier: 'T1', weight: 2 },
		{ slug: 'expense-report-smg', tier: 'T2', weight: 3 },
		{ slug: 'binder-blaster', tier: 'T1', weight: 3 },
		{ slug: 'severance-special', tier: 'T1', weight: 2 },
	],
	swat: [
		{ slug: 'expense-report-smg', tier: 'T2', weight: 2 },
		{ slug: 'binder-blaster', tier: 'T2', weight: 3 },
		{ slug: 'severance-special', tier: 'T1', weight: 2 },
		{ slug: 'toner-cannon', tier: 'T1', weight: 2 },
		{ slug: 'compliance-incinerator', tier: 'T1', weight: 2 },
	],
	squad: [
		{ slug: 'binder-blaster', tier: 'T2', weight: 2 },
		{ slug: 'severance-special', tier: 'T2', weight: 2 },
		{ slug: 'toner-cannon', tier: 'T2', weight: 2 },
		{ slug: 'compliance-incinerator', tier: 'T2', weight: 2 },
		{ slug: 'staple-rifle', tier: 'T3', weight: 1 },
		{ slug: 'expense-report-smg', tier: 'T3', weight: 1 },
		{ slug: 'severance-special', tier: 'T3', weight: 1 },
	],
};

const DROP_RATE: Record<ThreatTier, number> = {
	low: 0.3,
	police: 0.4,
	hitman: 0.5,
	swat: 0.7,
	squad: 1.0,
};

export function pickWeaponDrop(seed: string, floor: number, tier: ThreatTier): WeaponDrop | null {
	const rng = createRng(`${seed}::weapon-drop::floor-${floor}`);
	const dropRoll = rng.next();
	if (dropRoll >= DROP_RATE[tier]) return null;
	const pool = POOLS[tier];
	const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
	let pick = rng.next() * totalWeight;
	for (const entry of pool) {
		pick -= entry.weight;
		if (pick <= 0) return { slug: entry.slug, tier: entry.tier };
	}
	const last = pool[pool.length - 1];
	return last ? { slug: last.slug, tier: last.tier } : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/combat/weaponDrops.test.ts && pnpm typecheck`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/combat/weaponDrops.ts src/combat/weaponDrops.test.ts
git commit -m "feat(drops): per-floor weapon drop picker keyed off threat tier"
```

---

### Task 7: WeaponPickup R3F mount

**Files:**
- Create: `src/combat/WeaponPickup.tsx`

This task has no isolated unit test — R3F components rely on canvas mounting. A `tests/browser/` test could be added later but the visual-regression e2e in Task 13 covers it.

- [ ] **Step 1: Create the component**

```typescript
// src/combat/WeaponPickup.tsx
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, type Group, MathUtils, Vector3 } from 'three';
import type { Tier } from '@/ecs/components/Equipped';

const PICKUP_RADIUS = 1.2; // world units; player must be within this XZ distance

const TIER_COLOR: Record<Tier, string> = {
	T1: '#f4f1ea', // paper white
	T2: '#e0a33c', // terminal amber
	T3: '#2ea8c9', // toner cyan
};

interface Props {
	id: string;
	glb: string;          // basename, e.g. 'weapon-ak47.glb'
	tier: Tier;
	position: [number, number, number];
	getPlayerPosition: () => { x: number; y: number; z: number };
	onCollect: () => void;
}

export function WeaponPickup({ id, glb, tier, position, getPlayerPosition, onCollect }: Props) {
	const groupRef = useRef<Group>(null);
	const collectedRef = useRef(false);
	const url = `/assets/models/weapons/${glb}`;
	const { scene } = useGLTF(url);

	// Per-instance scene clone so multiple identical pickups don't share a
	// material instance.
	const cloned = useMemo(() => scene.clone(true), [scene]);

	// Normalize the GLB origin to the bbox bottom so the model sits
	// flat on the floor (the extraction pinned the origin at the grip
	// which is offset relative to the model bounds).
	useEffect(() => {
		const bbox = new Box3().setFromObject(cloned);
		const offsetY = -bbox.min.y;
		cloned.position.y = offsetY;
	}, [cloned]);

	useFrame((_, dt) => {
		if (collectedRef.current) return;
		const g = groupRef.current;
		if (!g) return;
		// Slow rotation + bob for readability
		g.rotation.y += dt * 0.6;
		g.position.y = position[1] + Math.sin(performance.now() / 400) * 0.06;

		// Proximity check
		const p = getPlayerPosition();
		const dx = p.x - position[0];
		const dz = p.z - position[2];
		if (Math.hypot(dx, dz) <= PICKUP_RADIUS) {
			collectedRef.current = true;
			onCollect();
		}
	});

	const tierColor = TIER_COLOR[tier];

	return (
		<group ref={groupRef} position={position}>
			<primitive object={cloned} scale={3} />
			{/* Tier glow ring */}
			<mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<ringGeometry args={[0.4, 0.55, 24]} />
				<meshStandardMaterial
					color={tierColor}
					emissive={tierColor}
					emissiveIntensity={1.5}
					transparent
					opacity={0.7}
				/>
			</mesh>
		</group>
	);
}

// Suppress unused import (MathUtils kept for future variant tinting).
void MathUtils;
void Vector3;
```

- [ ] **Step 2: Verify typecheck + browser-manual smoke**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/combat/WeaponPickup.tsx
git commit -m "feat(pickup): R3F WeaponPickup with tier-colored glow"
```

---

### Task 8: Workbench floor selector

**Files:**
- Create: `src/world/workbench/workbenchSpawn.ts`
- Test: `src/world/workbench/workbenchSpawn.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/world/workbench/workbenchSpawn.test.ts
import { describe, expect, it } from 'vitest';
import { isWorkbenchFloor, workbenchPositionFor } from './workbenchSpawn';

describe('workbenchSpawn', () => {
	it.each([5, 10, 15, 20])('floor %i is a workbench floor', (n) => {
		expect(isWorkbenchFloor(n)).toBe(true);
	});

	it.each([1, 2, 3, 4, 6, 7, 8, 9, 11])('floor %i is not a workbench floor', (n) => {
		expect(isWorkbenchFloor(n)).toBe(false);
	});

	it('workbenchPositionFor is deterministic per (seed, floor)', () => {
		const a = workbenchPositionFor('seed-A', 5, { x: 0, y: 0, z: 8 });
		const b = workbenchPositionFor('seed-A', 5, { x: 0, y: 0, z: 8 });
		expect(a).toEqual(b);
	});

	it('workbenchPositionFor stays within 4u of the down door', () => {
		const door = { x: 4, y: 0, z: 8 };
		const p = workbenchPositionFor('seed-X', 10, door);
		expect(Math.hypot(p.x - door.x, p.z - door.z)).toBeLessThanOrEqual(4);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/world/workbench/workbenchSpawn.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create the helper**

```typescript
// src/world/workbench/workbenchSpawn.ts
import { createRng } from '@/world/generator/rng';

export function isWorkbenchFloor(floor: number): boolean {
	return floor > 0 && floor % 5 === 0;
}

interface World3 { x: number; y: number; z: number }

export function workbenchPositionFor(seed: string, floor: number, downDoor: World3): World3 {
	const rng = createRng(`${seed}::workbench::floor-${floor}`);
	// Place in a 3u radius around the down-door for findability
	const angle = rng.next() * Math.PI * 2;
	const dist = 1.5 + rng.next() * 2.5; // 1.5..4u
	return {
		x: downDoor.x + Math.cos(angle) * dist,
		y: downDoor.y,
		z: downDoor.z + Math.sin(angle) * dist,
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/world/workbench/workbenchSpawn.test.ts && pnpm typecheck`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/world/workbench/workbenchSpawn.ts src/world/workbench/workbenchSpawn.test.ts
git commit -m "feat(workbench): every-5th-floor spawn helper + deterministic position"
```

---

### Task 9: WorkbenchEntity R3F + open-on-tap callback

**Files:**
- Create: `src/world/workbench/WorkbenchEntity.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/world/workbench/WorkbenchEntity.tsx
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, type Group } from 'three';

const OPEN_RADIUS = 1.5;

interface Props {
	id: string;
	position: [number, number, number];
	getPlayerPosition: () => { x: number; y: number; z: number };
	onPlayerNear: () => void;
	/** When true, the host has opened the panel — suppresses re-fire of
	 *  onPlayerNear until the player walks away + comes back. */
	suppressed: boolean;
}

export function WorkbenchEntity({
	id,
	position,
	getPlayerPosition,
	onPlayerNear,
	suppressed,
}: Props) {
	const groupRef = useRef<Group>(null);
	const wasNearRef = useRef(false);
	const { scene } = useGLTF('/assets/models/props/desk.glb');
	const cloned = useMemo(() => scene.clone(true), [scene]);

	// Sit the desk on the floor.
	useEffect(() => {
		const bbox = new Box3().setFromObject(cloned);
		cloned.position.y = -bbox.min.y;
	}, [cloned]);

	useFrame(() => {
		const p = getPlayerPosition();
		const dx = p.x - position[0];
		const dz = p.z - position[2];
		const near = Math.hypot(dx, dz) <= OPEN_RADIUS;
		// Edge-trigger on (was-far → near) and gate on suppressed
		if (near && !wasNearRef.current && !suppressed) {
			onPlayerNear();
		}
		wasNearRef.current = near;
	});

	return (
		<group ref={groupRef} position={position}>
			<primitive object={cloned} scale={1.2} />
			{/* Glowing terminal cube on top — the obvious visual cue */}
			<mesh position={[0, 1.2, 0]}>
				<boxGeometry args={[0.4, 0.3, 0.3]} />
				<meshStandardMaterial color="#2ea8c9" emissive="#2ea8c9" emissiveIntensity={1.5} />
			</mesh>
		</group>
	);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/world/workbench/WorkbenchEntity.tsx
git commit -m "feat(workbench): WorkbenchEntity R3F with proximity-trigger callback"
```

---

### Task 10: WorkbenchPanel UI

**Files:**
- Create: `app/views/WorkbenchPanel.tsx`

- [ ] **Step 1: Create the panel**

```typescript
// app/views/WorkbenchPanel.tsx
import { type Tier } from '@/ecs/components/Equipped';
import type { Equipped } from '@/ecs/components/Equipped';
import type { WeaponCurrency } from '@/ecs/components/WeaponCurrency';
import type { Weapon } from '@/content/weapons';
import { canUpgrade, nextTier, upgradeCost } from '@/combat/upgrade';
import { Button, Dialog } from '@/ui/primitives';

interface Props {
	open: boolean;
	onClose: () => void;
	equipped: Equipped;
	wallet: WeaponCurrency;
	weapons: Map<string, Weapon> | null;
	onUpgrade: (slotIdx: number, fromTier: Tier, toTier: Tier) => void;
}

export function WorkbenchPanel({ open, onClose, equipped, wallet, weapons, onUpgrade }: Props) {
	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay data-testid="workbench-overlay" />
				<Dialog.Content data-testid="workbench-panel" aria-describedby="wb-desc">
					<Dialog.Title>WORKBENCH</Dialog.Title>
					<Dialog.Description
						id="wb-desc"
						style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
					>
						Spend pickup currency to upgrade weapon tiers.
					</Dialog.Description>
					<div style={{ marginBottom: 'var(--space-4)' }}>
						<div style={{ display: 'flex', gap: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', opacity: 0.8 }}>
							<span>☕ {wallet.coffee}</span>
							<span>📎 {wallet.binderClips}</span>
							<span>🍩 {wallet.donuts}</span>
							<span>💼 {wallet.briefcases}</span>
						</div>
					</div>
					<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
						{equipped.slots.map((slot, idx) => {
							if (!slot.slug) return null;
							const w = weapons?.get(slot.slug);
							if (!w) return null;
							const next = nextTier(slot.tier);
							const cost = next ? upgradeCost(slot.tier, next) : null;
							const affordable = next ? canUpgrade(wallet, slot.tier, next) : false;
							return (
								<li
									key={`${slot.slug}-${idx}`}
									data-testid={`wb-row-${slot.slug}`}
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										padding: 'var(--space-2)',
										borderBottom: '1px solid var(--ink)',
									}}
								>
									<div>
										<div style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
											{w.name}
										</div>
										<div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{slot.tier}</div>
									</div>
									{next && cost && (
										<Button
											data-testid={`wb-upgrade-${slot.slug}`}
											variant={affordable ? 'auditor' : 'ghost'}
											disabled={!affordable}
											onClick={() => onUpgrade(idx, slot.tier, next)}
										>
											→ {next} (☕{cost.coffee ?? 0}/📎{cost.binderClips ?? 0}/🍩{cost.donuts ?? 0}/💼{cost.briefcases ?? 0})
										</Button>
									)}
									{!next && (
										<span style={{ fontSize: '0.85rem', opacity: 0.5 }}>MAX</span>
									)}
								</li>
							);
						})}
					</ul>
					<div style={{ marginTop: 'var(--space-5)' }}>
						<Button data-testid="workbench-close" variant="ghost" onClick={onClose}>
							CLOSE
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/views/WorkbenchPanel.tsx
git commit -m "feat(workbench): WorkbenchPanel dialog with per-slot upgrade rows"
```

---

### Task 11: Equipped migration helper

**Files:**
- Modify: `src/db/repos/weapons.ts`
- Test: `src/db/repos/weapons.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/db/repos/weapons.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { freshEquipped, setSlot } from '@/ecs/components/Equipped';
import { migrateAlphaWeaponSlugs } from './weapons';

describe('migrateAlphaWeaponSlugs', () => {
	it('renames stapler → staple-rifle T1', () => {
		const eq = setSlot(freshEquipped(), 0, 'stapler', -1);
		const next = migrateAlphaWeaponSlugs(eq);
		expect(next.slots[0]?.slug).toBe('staple-rifle');
		expect(next.slots[0]?.tier).toBe('T1');
		expect(next.slots[0]?.ammo).toBe(30);
	});

	it('renames three-hole-punch → expense-report-smg T1', () => {
		const eq = setSlot(freshEquipped(), 1, 'three-hole-punch', 10);
		const next = migrateAlphaWeaponSlugs(eq);
		expect(next.slots[1]?.slug).toBe('expense-report-smg');
		expect(next.slots[1]?.tier).toBe('T1');
		// ammo preserved when the destination weapon has ammo
		expect(next.slots[1]?.ammo).toBe(10);
	});

	it('drops letter-opener and whiteboard-marker (no equivalent)', () => {
		let eq = setSlot(freshEquipped(), 0, 'letter-opener', -1);
		eq = setSlot(eq, 1, 'whiteboard-marker', -1);
		const next = migrateAlphaWeaponSlugs(eq);
		expect(next.slots[0]?.slug).toBeNull();
		expect(next.slots[1]?.slug).toBeNull();
	});

	it('preserves new-format slugs unchanged', () => {
		const eq = setSlot(freshEquipped(), 0, 'staple-rifle', 30, 'T2');
		const next = migrateAlphaWeaponSlugs(eq);
		expect(next.slots[0]?.slug).toBe('staple-rifle');
		expect(next.slots[0]?.tier).toBe('T2');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/db/repos/weapons.test.ts -t "migrateAlpha"`
Expected: FAIL — `migrateAlphaWeaponSlugs` not exported.

- [ ] **Step 3: Add the migration helper**

Append to `src/db/repos/weapons.ts`:

```typescript
import { type Equipped, emptySlot } from '@/ecs/components/Equipped';

const ALPHA_RENAMES: Record<string, { slug: string; ammo: number } | null> = {
	stapler: { slug: 'staple-rifle', ammo: 30 },
	'three-hole-punch': { slug: 'expense-report-smg', ammo: 32 },
	'toner-cannon': { slug: 'toner-cannon', ammo: 4 }, // identity rename, still defaults to T1 ammoCap
	'fax-machine': { slug: 'compliance-incinerator', ammo: 50 },
	'letter-opener': null,
	'whiteboard-marker': null,
};

const NEW_SLUGS = new Set([
	'staple-rifle',
	'binder-blaster',
	'expense-report-smg',
	'toner-cannon',
	'compliance-incinerator',
	'severance-special',
]);

export function migrateAlphaWeaponSlugs(eq: Equipped): Equipped {
	const slots = eq.slots.map((slot) => {
		if (!slot.slug) return slot;
		// Already on the new schema — leave alone (preserves tier).
		if (NEW_SLUGS.has(slot.slug)) return slot;
		const target = ALPHA_RENAMES[slot.slug];
		if (target === null) return emptySlot(); // dropped
		if (!target) return slot; // unknown slug — leave as-is
		// Preserve ammo if the player had less than the new T1 cap;
		// otherwise default to the new cap.
		const ammo = slot.ammo === -1 ? target.ammo : Math.min(slot.ammo, target.ammo);
		return { slug: target.slug, ammo, lastFireAt: slot.lastFireAt, tier: 'T1' as const };
	});
	return { ...eq, slots };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/db/repos/weapons.test.ts && pnpm typecheck`
Expected: 4 new passing.

- [ ] **Step 5: Commit**

```bash
git add src/db/repos/weapons.ts src/db/repos/weapons.test.ts
git commit -m "feat(migrate): alpha weapon slug renames preserving ammo"
```

---

### Task 12: Wire it all in Game.tsx

**Files:**
- Modify: `app/views/Game.tsx`

This task touches Game.tsx in several focused places. Each step modifies one block.

- [ ] **Step 1: Add the new imports**

Insert near the existing imports:

```typescript
import { addCurrency, freshCurrency, spendCurrency, type WeaponCurrency } from '@/ecs/components/WeaponCurrency';
import type { Tier } from '@/ecs/components/Equipped';
import { setSlotTier } from '@/ecs/components/Equipped';
import { pickWeaponDrop, type WeaponDrop } from '@/combat/weaponDrops';
import { tierFor } from '@/combat/threat';
import { upgradeCost, nextTier as nextTierFn } from '@/combat/upgrade';
import { isWorkbenchFloor, workbenchPositionFor } from '@/world/workbench/workbenchSpawn';
import { WorkbenchEntity } from '@/world/workbench/WorkbenchEntity';
import { WeaponPickup } from '@/combat/WeaponPickup';
import { WorkbenchPanel } from './WorkbenchPanel';
import { migrateAlphaWeaponSlugs } from '@/db/repos/weapons';
```

- [ ] **Step 2: Bootstrap default loadout to the new starter**

Replace the existing `useState<Equipped>(...)` initializer:

```typescript
const [equipped, setEquipped] = useState<Equipped>(() => {
	// New starter loadout: only staple-rifle in slot 0, T1, full mag.
	// Migration of any persisted alpha-format saves runs in the
	// load-from-DB path (Task 11 handler).
	return setSlot(freshEquipped(), 0, 'staple-rifle', 30, 'T1');
});
```

- [ ] **Step 3: Add WeaponCurrency state + pickup tally**

Insert after the existing `[armor, setArmor]` line:

```typescript
const [wallet, setWallet] = useState<WeaponCurrency>(() => freshCurrency());
```

In `onPickupCollect`, after `applyPickup` runs, tally the kind:

```typescript
const onPickupCollect = useCallback(
	(dropId: string, kind: PickupKind) => {
		setPlayerHealth((h) => {
			const result = applyPickup({
				kind,
				health: h,
				equipped,
				armor,
				overhealCap: overhealCapRef.current,
			});
			if (result.armor !== armor) setArmor(result.armor);
			if (result.equipped !== equipped) setEquipped(result.equipped);
			overhealCapRef.current = result.overhealCap;
			return result.health;
		});
		// Tally currency for workbench upgrades (in addition to the
		// existing health/armor effect).
		const currencyKind =
			kind === 'binder-clips' ? 'binderClips'
			: kind === 'coffee' ? 'coffee'
			: kind === 'donut' ? 'donuts'
			: 'briefcases';
		setWallet((w) => addCurrency(w, currencyKind));
		setDrops((prev) => prev.filter((d) => d.id !== dropId));
	},
	[equipped, armor],
);
```

- [ ] **Step 4: Compute the per-floor weapon drop**

After the existing `enemySpawns = useMemo(...)` block, add:

```typescript
// One weapon drop per floor (sometimes none, depending on threat tier).
// Spawn position: pick a deterministic walkable cell ~3..6u in front
// of the down-door so the player passes near it on transit.
const weaponDrop = useMemo<{ drop: WeaponDrop; pos: [number, number, number] } | null>(() => {
	const tier = tierFor(threat);
	const pick = pickWeaponDrop(seed, floorState.currentFloor, tier);
	if (!pick) return null;
	const door = floorState.downDoorWorld;
	const rng = createRng(`${seed}::weapon-drop-pos::floor-${floorState.currentFloor}`);
	const angle = rng.next() * Math.PI * 2;
	const dist = 3 + rng.next() * 3;
	return {
		drop: pick,
		pos: [door.x + Math.cos(angle) * dist, 0.6, door.z + Math.sin(angle) * dist],
	};
}, [seed, floorState.currentFloor]);

const onWeaponPickup = useCallback(
	(drop: WeaponDrop, weapon: Weapon) => {
		// Replace the active slot's weapon with the new one at full mag
		// for the dropped tier.
		const ammo = weapon.tiers[drop.tier].ammoCap;
		setEquipped((eq) => setSlot(eq, eq.current, drop.slug, ammo, drop.tier));
	},
	[],
);
```

- [ ] **Step 5: Add workbench state**

After the `weaponDrop` block:

```typescript
const [workbenchOpen, setWorkbenchOpen] = useState(false);
const workbenchPos = useMemo<[number, number, number] | null>(() => {
	if (!isWorkbenchFloor(floorState.currentFloor)) return null;
	const p = workbenchPositionFor(seed, floorState.currentFloor, floorState.downDoorWorld);
	return [p.x, 0.4, p.z];
}, [seed, floorState.currentFloor, floorState.downDoorWorld]);

const onUpgradeWeapon = useCallback(
	(slotIdx: number, fromTier: Tier, toTier: Tier) => {
		const cost = upgradeCost(fromTier, toTier);
		if (!cost) return;
		setWallet((w) => spendCurrency(w, cost));
		setEquipped((eq) => setSlotTier(eq, slotIdx, toTier));
	},
	[],
);
```

- [ ] **Step 6: Mount the new entities + panel inside the JSX tree**

Inside the `<Physics>` block, after the `{drops.map(...)}` block, add:

```jsx
{weaponDrop && weapons?.get(weaponDrop.drop.slug) && (
	<WeaponPickup
		id={`weapon-${floorState.currentFloor}`}
		glb={weapons.get(weaponDrop.drop.slug)!.viewmodel?.glb ?? 'weapon-ak47.glb'}
		tier={weaponDrop.drop.tier}
		position={weaponDrop.pos}
		getPlayerPosition={getPlayerPosition}
		onCollect={() => {
			const w = weapons.get(weaponDrop.drop.slug);
			if (w) onWeaponPickup(weaponDrop.drop, w);
		}}
	/>
)}
{workbenchPos && (
	<WorkbenchEntity
		id={`workbench-${floorState.currentFloor}`}
		position={workbenchPos}
		getPlayerPosition={getPlayerPosition}
		onPlayerNear={() => setWorkbenchOpen(true)}
		suppressed={workbenchOpen}
	/>
)}
```

After the `<PauseMenu .../>`, add:

```jsx
<WorkbenchPanel
	open={workbenchOpen}
	onClose={() => setWorkbenchOpen(false)}
	equipped={equipped}
	wallet={wallet}
	weapons={weapons}
	onUpgrade={onUpgradeWeapon}
/>
```

- [ ] **Step 7: Verify typecheck + tests**

Run: `pnpm typecheck && pnpm test:node`
Expected: typecheck clean, all 444+new tests pass.

- [ ] **Step 8: Commit**

```bash
git add app/views/Game.tsx
git commit -m "feat(game): wire weapon drops + workbench + currency wallet"
```

---

### Task 13: Update useFrameWeaponTick to use tier stats

**Files:**
- Modify: `src/combat/useFrameWeaponTick.ts`

The existing tick reads `weapon.cooldownMs` / `weapon.range` / `weapon.damage` directly. After Task 1 those fields moved into `weapon.tiers[tier]`. Wire the lookup.

- [ ] **Step 1: Find the call site**

Run: `grep -n "weapon.cooldownMs\|weapon.damage\|weapon.range" src/combat/useFrameWeaponTick.ts`
Expected: shows lines 67-72 (approx) using the old shape.

- [ ] **Step 2: Replace stat lookups with weaponStatsFor**

In `src/combat/useFrameWeaponTick.ts`, replace the inline stat reads:

```typescript
import { type Weapon, weaponStatsFor } from '@/content/weapons';
import { currentTier } from '@/ecs/components/Equipped';
```

Inside the `setInterval` body, replace the block reading `weapon.range / weapon.damage / weapon.cooldownMs`:

```typescript
const stats = weaponStatsFor(weapon, currentTier(cur.equipped));
const range = stats.range;
const inRange = dist <= range;
const now = performance.now() / 1000;
const ready =
	canFire(cur.equipped, stats.cooldownMs, now * 1000) &&
	now * 1000 - cur.lastFireAtRef.current * 1000 >= stats.cooldownMs;
// ... when applying damage:
const baseDmg = stats.damage;
```

(Keep the rest of the tick — engageState, fire callback, ammo decrement — unchanged.)

- [ ] **Step 3: Verify typecheck + tests**

Run: `pnpm typecheck && pnpm test:node`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/combat/useFrameWeaponTick.ts
git commit -m "feat(weapons): tick reads tier-resolved weapon stats"
```

---

### Task 14: E2E playthrough verification

**Files:**
- Create: `e2e/weapon-progression.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// e2e/weapon-progression.spec.ts
import { expect, test } from '@playwright/test';
import { bootGame } from './fixtures/boot';

test('@golden weapon pickup swaps active weapon + tier color matches', async ({ page }) => {
	await bootGame(page, { enterGame: true, query: '?test=1' });
	await page.waitForTimeout(2500);
	const before = await page.evaluate(() => {
		const w = window as unknown as { __dord?: { state: () => unknown } };
		return w.__dord?.state();
	});
	expect(before).toBeTruthy();

	// Walk to the down-door area; the weapon drop spawns near it.
	await page.keyboard.down('w');
	await page.waitForTimeout(2200);
	await page.keyboard.up('w');

	// Take a screenshot for visual regression
	await page.screenshot({ path: 'tests/visual/__screenshots__/weapon-pickup-area.png' });
	// Sanity: state still readable
	const after = await page.evaluate(() => {
		const w = window as unknown as { __dord?: { state: () => unknown } };
		return w.__dord?.state();
	});
	expect(after).toBeTruthy();
});

test('@golden workbench appears on floor 5', async ({ page }) => {
	await bootGame(page, { enterGame: true, query: '?test=1' });
	await page.waitForTimeout(2500);
	// Force-jump to floor 5 via __dord debug hook (added by this task)
	await page.evaluate(() => {
		const w = window as unknown as { __dord?: { jumpToFloor?: (n: number) => void } };
		w.__dord?.jumpToFloor?.(5);
	});
	await page.waitForTimeout(1500);
	const floor = await page.evaluate(() => {
		const w = window as unknown as { __dord?: { state: () => { floor: number } } };
		return w.__dord?.state().floor;
	});
	expect(floor).toBe(5);
});
```

- [ ] **Step 2: Add the `jumpToFloor` debug hook**

In `app/views/Game.tsx`, inside the existing `__dord` test-mode block, add:

```typescript
(w.__dord as Record<string, unknown>).jumpToFloor = (n: number) => {
	swapTo(n > floorState.currentFloor ? 'up' : 'down');
};
```

(The actual implementation will need a richer jump because swapTo is single-direction; for the e2e a single 'up' swap to reach floor 2 is acceptable as a smoke verification. Plan revisit: if jump-by-N is needed, adapt swapTo to take a target floor.)

- [ ] **Step 3: Run e2e**

Run: `pnpm test:e2e -g "@golden" --reporter=list`
Expected: both tests pass.

- [ ] **Step 4: Commit**

```bash
git add e2e/weapon-progression.spec.ts app/views/Game.tsx
git commit -m "test(weapons): e2e for weapon pickup + workbench spawn"
```

---

### Task 15: Update foundation spec § weapon roster

**Files:**
- Modify: `docs/superpowers/specs/2026-04-29-dord-foundation-design.md`

- [ ] **Step 1: Find the alpha weapon section**

Run: `grep -n "Stapler\|Three-Hole\|weapon roster" docs/superpowers/specs/2026-04-29-dord-foundation-design.md | head`

- [ ] **Step 2: Add a pointer to the new spec**

Right above the alpha weapon-table description, insert:

```markdown
> **2026-04-30 update.** The alpha weapon roster (Stapler / Three-Hole Punch) was replaced by the real-gun roster documented in [`weapon-progression-design.md`](./2026-04-30-weapon-progression-design.md). The text below is preserved for historical context; runtime behavior follows the newer spec.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-29-dord-foundation-design.md
git commit -m "docs(spec): foundation pointer to new weapon-progression spec"
```

---

### Task 16: True DOT for Compliance Incinerator

**Files:**
- Create: `src/combat/burn.ts`
- Test: `src/combat/burn.test.ts`
- Modify: `src/combat/useFrameWeaponTick.ts` (apply burn on incinerator hit)
- Modify: `src/ai/enemies/MiddleManagerEntity.tsx` (tick own burn, take dmg)

- [ ] **Step 1: Write the failing test**

```typescript
// src/combat/burn.test.ts
import { describe, expect, it } from 'vitest';
import { applyBurn, freshBurn, tickBurn } from './burn';

describe('burn', () => {
	it('applies a fresh burn with the requested dpt + duration', () => {
		const b = applyBurn(freshBurn(), { dmgPerTick: 4, ticksRemaining: 5, intervalMs: 200 }, 1.0);
		expect(b.dmgPerTick).toBe(4);
		expect(b.ticksRemaining).toBe(5);
		expect(b.nextTickAt).toBeCloseTo(1.2, 3);
	});

	it('refreshes duration on a re-apply (no stack of dmgPerTick)', () => {
		let b = applyBurn(freshBurn(), { dmgPerTick: 4, ticksRemaining: 2, intervalMs: 200 }, 1.0);
		b = applyBurn(b, { dmgPerTick: 6, ticksRemaining: 5, intervalMs: 200 }, 1.4);
		expect(b.dmgPerTick).toBe(6); // last application wins
		expect(b.ticksRemaining).toBe(5); // refreshed, not added
	});

	it('tickBurn deals dmg + decrements ticksRemaining when interval elapses', () => {
		let b = applyBurn(freshBurn(), { dmgPerTick: 4, ticksRemaining: 3, intervalMs: 200 }, 1.0);
		const r = tickBurn(b, 1.25); // 0.25s past application; nextTickAt was 1.2
		expect(r.damage).toBe(4);
		b = r.next;
		expect(b.ticksRemaining).toBe(2);
		expect(b.nextTickAt).toBeCloseTo(1.45, 3);
	});

	it('tickBurn deals nothing when interval has not elapsed', () => {
		const b = applyBurn(freshBurn(), { dmgPerTick: 4, ticksRemaining: 3, intervalMs: 200 }, 1.0);
		const r = tickBurn(b, 1.1);
		expect(r.damage).toBe(0);
		expect(r.next).toEqual(b);
	});

	it('exhausted burn deals nothing further', () => {
		let b = applyBurn(freshBurn(), { dmgPerTick: 4, ticksRemaining: 1, intervalMs: 200 }, 1.0);
		b = tickBurn(b, 1.21).next;
		const r = tickBurn(b, 5.0);
		expect(r.damage).toBe(0);
		expect(r.next.ticksRemaining).toBe(0);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/combat/burn.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create the burn module**

```typescript
// src/combat/burn.ts
/**
 * Burn DOT (Compliance Incinerator). Per-enemy state — refreshed on
 * re-apply (no stacking dmgPerTick), drains via tickBurn each frame.
 *
 * Spec: incinerator's true-DOT lands on top of the per-tick hitscan so
 * the player feels "burning damage" rather than "machine gun." Designer
 * tuning: 4 dmg × 5 ticks × 200ms = 20 burn dmg over 1 sec on top of
 * the direct cone hit.
 */

export interface Burn {
	dmgPerTick: number;
	ticksRemaining: number;
	intervalMs: number;
	nextTickAt: number; // game seconds; 0 = inactive
}

export interface BurnApply {
	dmgPerTick: number;
	ticksRemaining: number;
	intervalMs: number;
}

export function freshBurn(): Burn {
	return { dmgPerTick: 0, ticksRemaining: 0, intervalMs: 0, nextTickAt: 0 };
}

export function applyBurn(prev: Burn, spec: BurnApply, now: number): Burn {
	return {
		dmgPerTick: spec.dmgPerTick,
		ticksRemaining: spec.ticksRemaining,
		intervalMs: spec.intervalMs,
		nextTickAt: now + spec.intervalMs / 1000,
	};
}

export function tickBurn(b: Burn, now: number): { next: Burn; damage: number } {
	if (b.ticksRemaining <= 0 || b.nextTickAt <= 0) return { next: b, damage: 0 };
	if (now < b.nextTickAt) return { next: b, damage: 0 };
	const next: Burn = {
		...b,
		ticksRemaining: b.ticksRemaining - 1,
		nextTickAt: b.ticksRemaining - 1 > 0 ? b.nextTickAt + b.intervalMs / 1000 : 0,
	};
	return { next, damage: b.dmgPerTick };
}
```

- [ ] **Step 4: Wire into the weapon tick (incinerator only)**

In `src/combat/useFrameWeaponTick.ts`, replace the existing `enemy.damage(finalDmg)` call when the weapon is the incinerator with both a damage call AND a burn application via the `EnemyHandle`. Add to `EnemyHandle`:

```typescript
// src/ai/enemies/MiddleManagerEntity.tsx — extend the interface
export interface EnemyHandle {
	id: string;
	getPosition(): { x: number; y: number; z: number };
	damage(n: number): void;
	applyBurn?(spec: { dmgPerTick: number; ticksRemaining: number; intervalMs: number }): void;
	isAlive(): boolean;
}
```

In `useFrameWeaponTick.ts`, after the existing `enemy.damage(finalDmg)` line:

```typescript
if (weapon.slug === 'compliance-incinerator' && enemy.applyBurn) {
	enemy.applyBurn({ dmgPerTick: 4, ticksRemaining: 5, intervalMs: 200 });
}
```

In `MiddleManagerEntity.tsx` add to the handle returned by `useEffect`:

```typescript
const burnRef = useRef(freshBurn());
const applyBurnFn = (spec: BurnApply) => {
	if (!aliveRef.current) return;
	burnRef.current = applyBurn(burnRef.current, spec, performance.now() / 1000);
};
// ... add to handle
const handle: EnemyHandle = {
	id,
	getPosition: ...,
	damage: damageFn,
	applyBurn: applyBurnFn,
	isAlive: () => aliveRef.current,
};
```

In the entity's `useFrame` body, before the FSM tick:

```typescript
const burnTick = tickBurn(burnRef.current, performance.now() / 1000);
if (burnTick.damage > 0) damageFn(burnTick.damage);
burnRef.current = burnTick.next;
```

Add the imports: `import { applyBurn, type BurnApply, freshBurn, tickBurn } from '@/combat/burn';`

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm vitest run src/combat/burn.test.ts && pnpm typecheck && pnpm test:node`
Expected: 5 burn tests pass, all 444+ pass.

- [ ] **Step 6: Commit**

```bash
git add src/combat/burn.ts src/combat/burn.test.ts src/combat/useFrameWeaponTick.ts src/ai/enemies/MiddleManagerEntity.tsx
git commit -m "feat(burn): true DOT for Compliance Incinerator (4dmg×5ticks@200ms)"
```

---

### Task 17: Wall-decoration placement helper

**Files:**
- Create: `src/world/devroom/wallDecor.ts`
- Test: `src/world/devroom/wallDecor.test.ts`

This is the *reusable* part — DevRoom uses it now, cubicle decoration in M5 polish reuses it later.

- [ ] **Step 1: Write the failing test**

```typescript
// src/world/devroom/wallDecor.test.ts
import { describe, expect, it } from 'vitest';
import { wallMountTransform, type WallSide } from './wallDecor';

describe('wallDecor', () => {
	it.each<[WallSide, { rotY: number }]>([
		['+x', { rotY: -Math.PI / 2 }],
		['-x', { rotY: Math.PI / 2 }],
		['+z', { rotY: Math.PI }],
		['-z', { rotY: 0 }],
	])('side %s yields rotY %j', (side, expected) => {
		const t = wallMountTransform({
			roomCenter: { x: 0, z: 0 },
			roomHalfX: 5,
			roomHalfZ: 5,
			side,
			alongFraction: 0.5,
			heightY: 1.5,
			surfaceOffset: 0.05,
		});
		expect(t.rotation[1]).toBeCloseTo(expected.rotY, 3);
	});

	it('places at the correct world position for +x wall', () => {
		const t = wallMountTransform({
			roomCenter: { x: 0, z: 0 },
			roomHalfX: 5,
			roomHalfZ: 5,
			side: '+x',
			alongFraction: 0.5,
			heightY: 1.5,
			surfaceOffset: 0.05,
		});
		// +x wall at room edge x=5; offset 0.05 inward → x=4.95
		expect(t.position[0]).toBeCloseTo(4.95, 3);
		expect(t.position[1]).toBe(1.5);
		expect(t.position[2]).toBe(0); // alongFraction 0.5 of [-5..5] → 0
	});

	it('alongFraction 0 places at the negative end of the wall', () => {
		const t = wallMountTransform({
			roomCenter: { x: 0, z: 0 },
			roomHalfX: 5,
			roomHalfZ: 5,
			side: '+x',
			alongFraction: 0,
			heightY: 1.5,
			surfaceOffset: 0.05,
		});
		// +x wall runs along z; alongFraction 0 = z=-5
		expect(t.position[2]).toBe(-5);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/world/devroom/wallDecor.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create the helper**

```typescript
// src/world/devroom/wallDecor.ts
/**
 * Wall-mounted prop placement. Reusable surface for both the DevRoom
 * (target dummy, weapon racks, posters) and post-1.0 cubicle decor
 * (whiteboards, calendars, achievement plaques).
 *
 * `side` names which wall of an axis-aligned box room. `alongFraction`
 * is 0..1 along that wall's length. `heightY` is the world Y of the
 * mount point. `surfaceOffset` pushes the prop slightly off the wall
 * so the geometry doesn't z-fight.
 *
 * Returns a (position, rotationEuler) pair — wire to a <group/> or
 * directly to <primitive position={...} rotation={...}/>.
 */

export type WallSide = '+x' | '-x' | '+z' | '-z';

interface MountInput {
	roomCenter: { x: number; z: number };
	roomHalfX: number;
	roomHalfZ: number;
	side: WallSide;
	alongFraction: number;
	heightY: number;
	surfaceOffset: number;
}

interface MountOutput {
	position: [number, number, number];
	rotation: [number, number, number];
}

export function wallMountTransform(i: MountInput): MountOutput {
	const t = Math.max(0, Math.min(1, i.alongFraction));
	let x = i.roomCenter.x;
	let z = i.roomCenter.z;
	let rotY = 0;
	switch (i.side) {
		case '+x':
			x = i.roomCenter.x + i.roomHalfX - i.surfaceOffset;
			z = i.roomCenter.z + (-i.roomHalfZ + t * 2 * i.roomHalfZ);
			rotY = -Math.PI / 2; // face -x (into room)
			break;
		case '-x':
			x = i.roomCenter.x - i.roomHalfX + i.surfaceOffset;
			z = i.roomCenter.z + (-i.roomHalfZ + t * 2 * i.roomHalfZ);
			rotY = Math.PI / 2; // face +x
			break;
		case '+z':
			x = i.roomCenter.x + (-i.roomHalfX + t * 2 * i.roomHalfX);
			z = i.roomCenter.z + i.roomHalfZ - i.surfaceOffset;
			rotY = Math.PI; // face -z
			break;
		case '-z':
			x = i.roomCenter.x + (-i.roomHalfX + t * 2 * i.roomHalfX);
			z = i.roomCenter.z - i.roomHalfZ + i.surfaceOffset;
			rotY = 0; // face +z
			break;
	}
	return { position: [x, i.heightY, z], rotation: [0, rotY, 0] };
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm vitest run src/world/devroom/wallDecor.test.ts && pnpm typecheck`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/world/devroom/wallDecor.ts src/world/devroom/wallDecor.test.ts
git commit -m "feat(decor): wall-mount transform helper for DevRoom + cubicle decor"
```

---

### Task 18: WeaponRack + TargetDummy R3F components

**Files:**
- Create: `src/world/devroom/WeaponRack.tsx`
- Create: `src/world/devroom/TargetDummy.tsx`

- [ ] **Step 1: Create WeaponRack**

```typescript
// src/world/devroom/WeaponRack.tsx
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, type Group } from 'three';
import type { Tier } from '@/ecs/components/Equipped';

const PICKUP_RADIUS = 1.2;

interface Props {
	id: string;
	weaponSlug: string;
	weaponGlb: string;
	tier: Tier;
	position: [number, number, number];
	getPlayerPosition: () => { x: number; y: number; z: number };
	onPickup: (slug: string, tier: Tier) => void;
}

const TIER_GLOW: Record<Tier, string> = {
	T1: '#f4f1ea',
	T2: '#e0a33c',
	T3: '#2ea8c9',
};

export function WeaponRack({ id, weaponSlug, weaponGlb, tier, position, getPlayerPosition, onPickup }: Props) {
	const groupRef = useRef<Group>(null);
	const lastPickupRef = useRef(0);
	const { scene } = useGLTF(`/assets/models/weapons/${weaponGlb}`);
	const cloned = useMemo(() => scene.clone(true), [scene]);

	useEffect(() => {
		const bbox = new Box3().setFromObject(cloned);
		cloned.position.y = -bbox.min.y;
	}, [cloned]);

	useFrame(() => {
		const p = getPlayerPosition();
		const dist = Math.hypot(p.x - position[0], p.z - position[2]);
		if (dist > PICKUP_RADIUS) return;
		// Rate-limit pickups to once per 1s so the player doesn't double-fire
		const now = performance.now();
		if (now - lastPickupRef.current < 1000) return;
		lastPickupRef.current = now;
		onPickup(weaponSlug, tier);
	});

	const glow = TIER_GLOW[tier];

	return (
		<group ref={groupRef} position={position}>
			{/* Desk surface */}
			<mesh position={[0, 0.4, 0]}>
				<boxGeometry args={[1.2, 0.05, 0.7]} />
				<meshStandardMaterial color="#5a564f" />
			</mesh>
			{/* Weapon GLB on top */}
			<group position={[0, 0.45, 0]} rotation={[0, Math.PI / 4, 0]}>
				<primitive object={cloned} scale={2} />
			</group>
			{/* Tier glow ring around the desk */}
			<mesh position={[0, 0.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<ringGeometry args={[0.55, 0.7, 24]} />
				<meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.5} transparent opacity={0.8} />
			</mesh>
		</group>
	);
}
```

- [ ] **Step 2: Create TargetDummy**

```typescript
// src/world/devroom/TargetDummy.tsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';
import type { EnemyHandle } from '@/ai/enemies/MiddleManagerEntity';

interface Props {
	id: string;
	position: [number, number, number];
	rotation: [number, number, number];
	onRegister: (h: EnemyHandle) => void;
	onUnregister: (id: string) => void;
}

/**
 * Wall-mounted target. Behaves as an EnemyHandle so the player's
 * weapon-tick + crosshair logic treats it as a normal target. Regenerates
 * HP every second so DPS measurement is continuous; the cumulative damage
 * over the last second is exposed via window.__dord.devDps for the
 * DevHUD readout.
 */
export function TargetDummy({ id, position, rotation, onRegister, onUnregister }: Props) {
	const groupRef = useRef<Group>(null);
	const meshRef = useRef<Mesh>(null);
	const aliveRef = useRef(true);
	// Damage taken in the last 1s — sliding window
	const damageWindowRef = useRef<{ at: number; dmg: number }[]>([]);

	useFrame(() => {
		const now = performance.now();
		damageWindowRef.current = damageWindowRef.current.filter((e) => now - e.at < 1000);
		const dps = damageWindowRef.current.reduce((s, e) => s + e.dmg, 0);
		const w = window as unknown as { __dord?: { devDps?: number } };
		if (w.__dord) w.__dord.devDps = dps;
		// Pulse mesh based on recent damage so the player gets visual feedback
		if (meshRef.current && dps > 0) {
			const pulse = Math.min(1, dps / 100);
			(meshRef.current.material as { emissiveIntensity?: number }).emissiveIntensity = pulse;
		}
	});

	const handle: EnemyHandle = {
		id,
		getPosition: () => ({ x: position[0], y: position[1], z: position[2] }),
		damage: (n: number) => {
			damageWindowRef.current.push({ at: performance.now(), dmg: n });
		},
		applyBurn: () => {
			// Targets accept burns too — just count them as damage on the next tick.
		},
		isAlive: () => aliveRef.current,
	};

	// Register/unregister via React effect equivalent — keep the DOM-style
	// handle stable across renders.
	useFrame(() => {}, 0); // ensure useFrame runs at least once
	if (groupRef.current && !groupRef.current.userData._registered) {
		onRegister(handle);
		groupRef.current.userData._registered = true;
	}

	return (
		<group ref={groupRef} position={position} rotation={rotation}>
			{/* Wall plate */}
			<mesh position={[0, 0, -0.04]}>
				<boxGeometry args={[1.4, 1.4, 0.05]} />
				<meshStandardMaterial color="#3a3631" />
			</mesh>
			{/* Target rings — emissive on hit */}
			<mesh ref={meshRef} position={[0, 0, 0]}>
				<circleGeometry args={[0.6, 32]} />
				<meshStandardMaterial color="#b33a3a" emissive="#b33a3a" emissiveIntensity={0} />
			</mesh>
			<mesh position={[0, 0, 0.01]}>
				<circleGeometry args={[0.4, 32]} />
				<meshStandardMaterial color="#f4f1ea" />
			</mesh>
			<mesh position={[0, 0, 0.02]}>
				<circleGeometry args={[0.2, 32]} />
				<meshStandardMaterial color="#b33a3a" />
			</mesh>
			{/* Suppress unused warning */}
			{((): null => { void onUnregister; return null; })()}
		</group>
	);
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/world/devroom/WeaponRack.tsx src/world/devroom/TargetDummy.tsx
git commit -m "feat(devroom): WeaponRack + TargetDummy with DPS readout"
```

---

### Task 19: DevRoom assembly

**Files:**
- Create: `src/world/devroom/DevRoom.tsx`

- [ ] **Step 1: Create the DevRoom**

```typescript
// src/world/devroom/DevRoom.tsx
import { useMemo } from 'react';
import type { Manifest } from '@/content/manifest';
import type { Weapon } from '@/content/weapons';
import type { Tier } from '@/ecs/components/Equipped';
import type { EnemyHandle } from '@/ai/enemies/MiddleManagerEntity';
import { MiddleManagerEntity } from '@/ai/enemies/MiddleManagerEntity';
import { TargetDummy } from './TargetDummy';
import { WeaponRack } from './WeaponRack';
import { wallMountTransform } from './wallDecor';

const ROOM_HALF_X = 8;
const ROOM_HALF_Z = 8;
const ROOM_HEIGHT = 4;

interface Props {
	manifest: Manifest;
	weapons: Map<string, Weapon> | null;
	getPlayerPosition: () => { x: number; y: number; z: number };
	applyPlayerDamage: (n: number) => boolean;
	onWeaponPickup: (slug: string, tier: Tier) => void;
	onEnemyKill: (slug: string, lastPos: { x: number; y: number; z: number }) => void;
	onRegisterEnemy: (h: EnemyHandle) => void;
	onUnregisterEnemy: (id: string) => void;
}

const ARCHETYPES = ['middle-manager', 'policeman', 'hitman', 'swat'] as const;

export function DevRoom({
	manifest,
	weapons,
	getPlayerPosition,
	applyPlayerDamage,
	onWeaponPickup,
	onEnemyKill,
	onRegisterEnemy,
	onUnregisterEnemy,
}: Props) {
	// Layout the weapon racks along the -z wall, evenly spaced
	const racks = useMemo(() => {
		if (!weapons) return [];
		return Array.from(weapons.values())
			.filter((w) => w.viewmodel)
			.map((w, i, arr) => {
				const t = wallMountTransform({
					roomCenter: { x: 0, z: 0 },
					roomHalfX: ROOM_HALF_X,
					roomHalfZ: ROOM_HALF_Z,
					side: '-z',
					alongFraction: (i + 0.5) / arr.length,
					heightY: 0,
					surfaceOffset: 1.0, // pull racks 1u into the room
				});
				return { weapon: w, position: t.position };
			});
	}, [weapons]);

	// Target dummy on +z wall, centered
	const targetT = useMemo(
		() =>
			wallMountTransform({
				roomCenter: { x: 0, z: 0 },
				roomHalfX: ROOM_HALF_X,
				roomHalfZ: ROOM_HALF_Z,
				side: '+z',
				alongFraction: 0.5,
				heightY: 1.5,
				surfaceOffset: 0.05,
			}),
		[],
	);

	// Enemies parked along the +x wall
	const enemySpots = useMemo(
		() =>
			ARCHETYPES.map((arch, i) => {
				const t = wallMountTransform({
					roomCenter: { x: 0, z: 0 },
					roomHalfX: ROOM_HALF_X,
					roomHalfZ: ROOM_HALF_Z,
					side: '+x',
					alongFraction: (i + 0.5) / ARCHETYPES.length,
					heightY: 0.8,
					surfaceOffset: 1.5,
				});
				return { archetype: arch, position: t.position };
			}),
		[],
	);

	return (
		<>
			{/* Floor (10×10 plane) */}
			<mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[ROOM_HALF_X * 2, ROOM_HALF_Z * 2]} />
				<meshStandardMaterial color="#2a2a2a" />
			</mesh>
			{/* Ceiling */}
			<mesh position={[0, ROOM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<planeGeometry args={[ROOM_HALF_X * 2, ROOM_HALF_Z * 2]} />
				<meshStandardMaterial color="#1a1a1a" />
			</mesh>
			{/* Four walls */}
			<mesh position={[ROOM_HALF_X, ROOM_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
				<planeGeometry args={[ROOM_HALF_Z * 2, ROOM_HEIGHT]} />
				<meshStandardMaterial color="#3a3631" />
			</mesh>
			<mesh position={[-ROOM_HALF_X, ROOM_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
				<planeGeometry args={[ROOM_HALF_Z * 2, ROOM_HEIGHT]} />
				<meshStandardMaterial color="#3a3631" />
			</mesh>
			<mesh position={[0, ROOM_HEIGHT / 2, ROOM_HALF_Z]} rotation={[0, Math.PI, 0]}>
				<planeGeometry args={[ROOM_HALF_X * 2, ROOM_HEIGHT]} />
				<meshStandardMaterial color="#3a3631" />
			</mesh>
			<mesh position={[0, ROOM_HEIGHT / 2, -ROOM_HALF_Z]} rotation={[0, 0, 0]}>
				<planeGeometry args={[ROOM_HALF_X * 2, ROOM_HEIGHT]} />
				<meshStandardMaterial color="#3a3631" />
			</mesh>

			{/* Weapon racks along -z */}
			{racks.map((r) => (
				<WeaponRack
					key={r.weapon.slug}
					id={`devroom-rack-${r.weapon.slug}`}
					weaponSlug={r.weapon.slug}
					weaponGlb={r.weapon.viewmodel?.glb ?? 'weapon-ak47.glb'}
					tier="T1"
					position={r.position}
					getPlayerPosition={getPlayerPosition}
					onPickup={onWeaponPickup}
				/>
			))}

			{/* Target on +z */}
			<TargetDummy
				id="devroom-target"
				position={targetT.position}
				rotation={targetT.rotation}
				onRegister={onRegisterEnemy}
				onUnregister={onUnregisterEnemy}
			/>

			{/* Enemy parade along +x */}
			{enemySpots.map((spot) => (
				<MiddleManagerEntity
					key={`devroom-enemy-${spot.archetype}`}
					id={`devroom-enemy-${spot.archetype}`}
					manifest={manifest}
					navMesh={null}
					spawn={[spot.position[0], 0.8, spot.position[2]]}
					archetype={spot.archetype}
					getPlayerPosition={getPlayerPosition}
					applyPlayerDamage={applyPlayerDamage}
					onKill={onEnemyKill}
					onRegister={onRegisterEnemy}
					onUnregister={onUnregisterEnemy}
				/>
			))}
		</>
	);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/world/devroom/DevRoom.tsx
git commit -m "feat(devroom): assembled DevRoom with racks + target + enemy parade"
```

---

### Task 20: Wire ?dev=1 routing in Game.tsx

**Files:**
- Modify: `app/views/Game.tsx`

- [ ] **Step 1: Detect the dev flag**

Near the top of the `Game` function body, add:

```typescript
const devMode = typeof window !== 'undefined' && window.location.search.includes('dev=1');
```

- [ ] **Step 2: Branch the World mount**

Replace the existing `<World ... />` mount with:

```jsx
{devMode ? (
	manifest && (
		<DevRoom
			manifest={manifest}
			weapons={weapons}
			getPlayerPosition={getPlayerPosition}
			applyPlayerDamage={applyPlayerDamage}
			onWeaponPickup={(slug, tier) => {
				const w = weapons?.get(slug);
				if (!w) return;
				const ammo = w.tiers[tier].ammoCap;
				setEquipped((eq) => setSlot(eq, eq.current, slug, ammo, tier));
			}}
			onEnemyKill={onEnemyKill}
			onRegisterEnemy={registerEnemy}
			onUnregisterEnemy={unregisterEnemy}
		/>
	)
) : (
	manifest && (
		<World
			manifest={manifest}
			seed={seed}
			floor={floorState.currentFloor}
			{...(placements !== undefined && { placements })}
		/>
	)
)}
```

Then in the rest of the JSX tree, gate `enemySpawns.map(...)`, `weaponDrop`, and `WorkbenchEntity` blocks on `!devMode` so they don't double up with the DevRoom contents.

- [ ] **Step 3: Add the import**

```typescript
import { DevRoom } from '@/world/devroom/DevRoom';
```

- [ ] **Step 4: Verify typecheck + boot probe**

Run: `pnpm typecheck && pnpm dev`
In another terminal: `curl http://localhost:5173/?dev=1` (or open in browser).
Expected: dev room loads, racks visible, target visible, enemies visible.

- [ ] **Step 5: Commit**

```bash
git add app/views/Game.tsx
git commit -m "feat(devroom): ?dev=1 routes to DevRoom instead of normal world"
```

---

### Task 21: DevHUD overlay

**Files:**
- Create: `src/verify/DevHUD.tsx`
- Modify: `app/views/Game.tsx` (mount when devMode + key listener)

- [ ] **Step 1: Create the DevHUD**

```typescript
// src/verify/DevHUD.tsx
import { useEffect, useState } from 'react';

interface Props {
	getPlayerPosition: () => { x: number; y: number; z: number };
	weaponSlug: string | null;
	tier: string;
	ammo: number;
}

export function DevHUD({ getPlayerPosition, weaponSlug, tier, ammo }: Props) {
	const [tick, setTick] = useState(0);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const id = setInterval(() => setTick((t) => t + 1), 200);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === '`') setVisible((v) => !v);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	if (!visible) return null;

	const pos = getPlayerPosition();
	const w = window as unknown as {
		__dord?: { devDps?: number; perf?: () => { calls?: number; frameMs?: number } };
	};
	const dps = w.__dord?.devDps ?? 0;
	const perf = w.__dord?.perf?.();

	return (
		<div
			data-testid="dev-hud"
			style={{
				position: 'absolute',
				top: 16,
				left: 16,
				padding: 'var(--space-3)',
				background: 'rgba(13, 15, 18, 0.85)',
				color: 'var(--paper)',
				font: '11px ui-monospace, monospace',
				lineHeight: 1.5,
				zIndex: 50,
				pointerEvents: 'none',
			}}
		>
			<div style={{ opacity: 0.6, marginBottom: 4 }}>DEV (` to toggle) — tick {tick}</div>
			<div>POS  {pos.x.toFixed(2)} / {pos.y.toFixed(2)} / {pos.z.toFixed(2)}</div>
			<div>WPN  {weaponSlug ?? '∅'} {tier} ammo={ammo}</div>
			<div>DPS  {dps.toFixed(1)}</div>
			<div>CALL {perf?.calls ?? '?'}  FRAME {perf?.frameMs?.toFixed(1) ?? '?'}ms</div>
		</div>
	);
}
```

- [ ] **Step 2: Mount in Game.tsx**

Inside the JSX tree, after `<HpBar/>`:

```jsx
{devMode && (
	<DevHUD
		getPlayerPosition={getPlayerPosition}
		weaponSlug={currentWeaponSlug(equipped)}
		tier={equipped.slots[equipped.current]?.tier ?? 'T1'}
		ammo={currentAmmo(equipped)}
	/>
)}
```

Add the import:

```typescript
import { DevHUD } from '@/verify/DevHUD';
```

- [ ] **Step 3: Verify typecheck + manual smoke**

Run: `pnpm typecheck`
Then visit `http://localhost:5173/?dev=1` and confirm:
- DevHUD visible top-left
- Backtick toggles
- POS / WPN / DPS update on action
- Picking up a weapon from a rack swaps the active slot
- Shooting the wall target shows DPS climb

- [ ] **Step 4: Commit**

```bash
git add src/verify/DevHUD.tsx app/views/Game.tsx
git commit -m "feat(devhud): dev-mode overlay with pos/weapon/dps/draw-calls"
```

---

## Self-Review

**1. Spec coverage check:**

| Spec section / user request | Implementing task |
|---|---|
| Six-gun roster + slug names | Task 2 |
| Tier types + curves | Tasks 1, 2 |
| Pickup → currency tally | Task 12 step 3 |
| Drop tables keyed off threat | Task 6 |
| Workbench on every 5th floor | Tasks 8, 9 |
| Workbench upgrade UI | Task 10 |
| Migration of alpha saves | Task 11 |
| Compliance Incinerator true DOT | Task 16 |
| Viewmodel binding consumed | Task 1 (data); existing #102 task consumes it |
| Dev Room (?dev=1) | Tasks 17–20 |
| Wall-decoration spawning helper | Task 17 (used by DevRoom in Task 19, reusable for cubicle decor) |
| One-of-each enemy in Dev Room | Task 19 (`ARCHETYPES` parade along +x wall) |
| DevHUD + backtick toggle + perf readout | Task 21 |
| Save migration `weapon_schema_version` column | Deferred — Task 11 covers the in-memory rename; the disk-side schema column is needed only when the pickup→disk write path lands (currently alpha persistence is in-memory only per directive item #1). |

**2. Placeholder scan:** None.

**3. Type consistency:** `Tier` defined in Task 3 (`'T1'\|'T2'\|'T3'`), used identically in Tasks 1, 4, 5, 6, 10, 11, 12, 16, 18, 19, 20. `WeaponCurrency` shape in Task 4 used by Tasks 5, 10, 12. `WeaponDrop` from Task 6 consumed by Task 12. `weaponStatsFor` defined in Task 1, consumed in Tasks 13, 20. `EnemyHandle` from `MiddleManagerEntity` extended in Task 16 (`applyBurn?`), consumed by Tasks 18 + 19. `wallMountTransform` from Task 17 consumed by Task 19. All consistent.

---

## Plan complete

Saved to `docs/superpowers/plans/2026-04-30-weapon-progression.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
