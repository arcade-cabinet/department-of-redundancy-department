/**
 * Weapons table loader. Reads `public/content/weapons.json` (fetched at
 * runtime), hand-validates the shape (zod isn't installed yet — the
 * spec §8.6 mentions it for content but we keep the dep set tight
 * until PRQ-B0 expands the weapon roster), and exposes typed lookups.
 *
 * Two weapons in alpha:
 *   - stapler: melee, 12 dmg, 1.5u range, 400ms cooldown, 30° facing.
 *   - three-hole-punch: 3-round burst projectile, 8 dmg/round, 16u
 *     range, 6u/s muzzle, 25 ammo cap, 800ms full-cycle cooldown,
 *     80ms inter-burst spacing.
 *
 * Validation is loud — a malformed JSON throws and the manifest error
 * UI (Game.tsx) renders the message. PRQ-B0 swaps in zod when the
 * roster expands.
 */

export type WeaponKind = 'melee' | 'projectile' | 'hitscan';

interface MeleeWeapon {
	slug: string;
	name: string;
	kind: 'melee';
	damage: number;
	range: number;
	cooldownMs: number;
	/** Max angle (deg) between player.forward and target direction for a
	 *  hit to count. Stapler: 30°. */
	facingMaxDeg: number;
	spreadDeg: number;
	audioCueOnFire: string;
}

interface ProjectileWeapon {
	slug: string;
	name: string;
	kind: 'projectile';
	damage: number;
	range: number;
	cooldownMs: number;
	ammoCap: number;
	projectileSpeed: number;
	burstCount: number;
	burstIntervalMs: number;
	projectileLifetimeMs: number;
	spreadDeg: number;
	audioCueOnFire: string;
}

interface HitscanWeapon {
	slug: string;
	name: string;
	kind: 'hitscan';
	damage: number;
	range: number;
	cooldownMs: number;
	ammoCap: number;
	spreadDeg: number;
	audioCueOnFire: string;
}

export type Weapon = MeleeWeapon | ProjectileWeapon | HitscanWeapon;

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
		if (!json || !Array.isArray(json.weapons)) {
			throw new Error('weapons.json: expected { weapons: [...] }');
		}
		const map = new Map<string, Weapon>();
		for (const raw of json.weapons) {
			const w = validateWeapon(raw);
			map.set(w.slug, w);
		}
		weaponsCache = map;
		return map;
	})();
	pending.catch(() => {
		pending = null;
	});
	return pending;
}

/** Test-only / direct-input loader: validate an in-memory weapons table
 *  without fetching. Tests use this; runtime uses loadWeapons(). */
export function buildWeaponsTable(rawJson: unknown): Map<string, Weapon> {
	if (!rawJson || typeof rawJson !== 'object') {
		throw new Error('weapons table: must be an object');
	}
	const root = rawJson as { weapons?: unknown };
	if (!Array.isArray(root.weapons)) {
		throw new Error('weapons table: expected { weapons: [...] }');
	}
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
	const damage = mustNumber(r.damage, 'damage');
	const range = mustNumber(r.range, 'range');
	const cooldownMs = mustNumber(r.cooldownMs, 'cooldownMs');
	const spreadDeg = mustNumber(r.spreadDeg, 'spreadDeg');
	const audioCueOnFire = mustString(r.audioCueOnFire, 'audioCueOnFire');

	if (kind === 'melee') {
		return {
			slug,
			name,
			kind,
			damage,
			range,
			cooldownMs,
			facingMaxDeg: mustNumber(r.facingMaxDeg, 'facingMaxDeg'),
			spreadDeg,
			audioCueOnFire,
		};
	}
	if (kind === 'projectile') {
		return {
			slug,
			name,
			kind,
			damage,
			range,
			cooldownMs,
			ammoCap: mustNumber(r.ammoCap, 'ammoCap'),
			projectileSpeed: mustNumber(r.projectileSpeed, 'projectileSpeed'),
			burstCount: mustNumber(r.burstCount, 'burstCount'),
			burstIntervalMs: mustNumber(r.burstIntervalMs, 'burstIntervalMs'),
			projectileLifetimeMs: mustNumber(r.projectileLifetimeMs, 'projectileLifetimeMs'),
			spreadDeg,
			audioCueOnFire,
		};
	}
	if (kind === 'hitscan') {
		return {
			slug,
			name,
			kind,
			damage,
			range,
			cooldownMs,
			ammoCap: mustNumber(r.ammoCap, 'ammoCap'),
			spreadDeg,
			audioCueOnFire,
		};
	}
	throw new Error(`unknown weapon kind: ${String(kind)}`);
}

function mustString(v: unknown, field: string): string {
	if (typeof v !== 'string' || v.length === 0) {
		throw new Error(`weapon.${field}: expected non-empty string`);
	}
	return v;
}

function mustNumber(v: unknown, field: string): number {
	if (typeof v !== 'number' || !Number.isFinite(v)) {
		throw new Error(`weapon.${field}: expected finite number`);
	}
	return v;
}
