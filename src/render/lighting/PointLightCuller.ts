import type { Vector3 } from 'three';

export type Lamp = {
	id: string;
	position: { x: number; y: number; z: number };
};

/**
 * Distance-cull `lamps` against `cameraPos`, returning the IDs of the
 * `maxActive` closest lamps. The cull runs every frame at the call site,
 * but only requires `O(n log n)` sorting per call (`n` ≈ 50 max in alpha,
 * negligible).
 *
 * Stable: when distances tie (e.g. within float epsilon), lamps with
 * lexicographically smaller IDs win, so the active set doesn't strobe
 * across frames at chunk boundaries.
 */
export function cullByDistance(
	lamps: readonly Lamp[],
	cameraPos: Vector3 | { x: number; y: number; z: number },
	maxActive: number,
): Set<string> {
	if (maxActive <= 0 || lamps.length === 0) return new Set();
	if (lamps.length <= maxActive) return new Set(lamps.map((l) => l.id));

	const scored = lamps.map((l) => {
		const dx = l.position.x - cameraPos.x;
		const dy = l.position.y - cameraPos.y;
		const dz = l.position.z - cameraPos.z;
		return { id: l.id, d: dx * dx + dy * dy + dz * dz };
	});
	scored.sort((a, b) => a.d - b.d || a.id.localeCompare(b.id));
	return new Set(scored.slice(0, maxActive).map((s) => s.id));
}

/**
 * Default per-tier max active count. Mobile keeps it tight to stay within
 * the spec §6 + §12 budgets; desktop has more headroom.
 */
export const MAX_POINT_LIGHTS_DEFAULT = {
	mobile: 8,
	desktop: 16,
} as const;
