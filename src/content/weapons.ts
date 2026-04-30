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
