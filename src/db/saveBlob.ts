/**
 * Save export/import + integrity checking (PRQ-RC2, M6).
 *
 * Spec §22.3 robustness: corruption recovery + export/import. The
 * blob is the persistent state needed to reconstruct a run — seed,
 * floor, threat, kills, deaths, played time, defeatedFloors. Per-
 * chunk dirty state lives in the SQLite blob and isn't ferried via
 * this surface.
 *
 * Checksum: simple FNV-1a over the canonical JSON of the
 * checksum-cleared blob. Detects accidental edits + truncation; not
 * cryptographic.
 */

export const SAVE_BLOB_VERSION = 1;

export interface SaveBlob {
	version: number;
	worldSeed: string;
	currentFloor: number;
	threat: number;
	kills: number;
	deaths: number;
	playedSeconds: number;
	defeatedFloors: number[];
	checksum: string;
}

export function exportSaveBlob(blob: SaveBlob): string {
	const withoutChecksum = { ...blob, checksum: '' };
	const csum = fnv1a(canonical(withoutChecksum));
	return JSON.stringify({ ...blob, checksum: csum });
}

export function importSaveBlob(json: string): SaveBlob | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return null;
	}
	if (!isValidSaveBlob(parsed)) return null;
	if (parsed.version !== SAVE_BLOB_VERSION) return null;
	const expected = fnv1a(canonical({ ...parsed, checksum: '' }));
	if (parsed.checksum !== expected) return null;
	return parsed;
}

export function isValidSaveBlob(v: unknown): v is SaveBlob {
	if (!v || typeof v !== 'object') return false;
	const o = v as Partial<SaveBlob>;
	return (
		typeof o.version === 'number' &&
		typeof o.worldSeed === 'string' &&
		typeof o.currentFloor === 'number' &&
		typeof o.threat === 'number' &&
		typeof o.kills === 'number' &&
		typeof o.deaths === 'number' &&
		typeof o.playedSeconds === 'number' &&
		Array.isArray(o.defeatedFloors) &&
		typeof o.checksum === 'string'
	);
}

function canonical(blob: Omit<SaveBlob, 'checksum'> & { checksum: string }): string {
	// Stable key order so the same logical content always hashes the same.
	const keys: (keyof SaveBlob)[] = [
		'version',
		'worldSeed',
		'currentFloor',
		'threat',
		'kills',
		'deaths',
		'playedSeconds',
		'defeatedFloors',
		'checksum',
	];
	const obj: Record<string, unknown> = {};
	for (const k of keys) obj[k] = (blob as Record<string, unknown>)[k];
	return JSON.stringify(obj);
}

function fnv1a(s: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, '0');
}
