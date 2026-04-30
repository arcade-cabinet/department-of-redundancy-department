import type { SurfaceKind } from '@/input/surfaceKind';

/**
 * Per-surface contextual action menus. The radial menu (RadialMenu.tsx)
 * mounts whatever this returns. Each option is data-only; the host
 * (PRQ-05 T2 input pipeline) handles the action via its `id` —
 * keeping options.ts free of game logic so it stays unit-testable.
 *
 * 5 slots is the spec §5 design constraint (5-slice arc). If a surface
 * has more options, prioritize the most-frequent and put the rest in a
 * sub-menu in PRQ-14 polish. Floor + wall-world both hit 5 already.
 */

export interface RadialOption {
	id: string;
	label: string;
	icon: string; // emoji placeholder until PRQ-14 design pass
}

const FLOOR: RadialOption[] = [
	{ id: 'place-stair', label: 'Place stair', icon: '🪜' },
	{ id: 'place-wall', label: 'Place wall', icon: '🧱' },
	{ id: 'place-desk', label: 'Place desk', icon: '🪑' },
	{ id: 'place-terminal', label: 'Place terminal', icon: '💻' },
	{ id: 'cancel', label: 'Cancel', icon: '✕' },
];

const WALL_WORLD: RadialOption[] = [
	{ id: 'mine', label: 'Mine', icon: '⛏️' },
	{ id: 'inspect', label: 'Inspect', icon: '🔍' },
	{ id: 'mark', label: 'Mark', icon: '🚩' },
	{ id: 'cancel', label: 'Cancel', icon: '✕' },
];

const WALL_PLACED: RadialOption[] = [
	{ id: 'mine', label: 'Mine', icon: '⛏️' },
	{ id: 'repair', label: 'Repair', icon: '🛠️' },
	{ id: 'inspect', label: 'Inspect', icon: '🔍' },
	{ id: 'cancel', label: 'Cancel', icon: '✕' },
];

const DESK: RadialOption[] = [
	{ id: 'work', label: 'Work', icon: '💼' },
	{ id: 'search', label: 'Search', icon: '🔍' },
	{ id: 'cancel', label: 'Cancel', icon: '✕' },
];

const TERMINAL: RadialOption[] = [
	{ id: 'use', label: 'Use', icon: '⌨️' },
	{ id: 'inspect', label: 'Inspect', icon: '🔍' },
	{ id: 'cancel', label: 'Cancel', icon: '✕' },
];

const PRINTER: RadialOption[] = [
	{ id: 'print', label: 'Print', icon: '🖨️' },
	{ id: 'inspect', label: 'Inspect', icon: '🔍' },
	{ id: 'cancel', label: 'Cancel', icon: '✕' },
];

const DOOR: RadialOption[] = [
	{ id: 'open', label: 'Open', icon: '🚪' },
	{ id: 'inspect', label: 'Inspect', icon: '🔍' },
	{ id: 'cancel', label: 'Cancel', icon: '✕' },
];

const ENEMY: RadialOption[] = [
	{ id: 'attack', label: 'Attack', icon: '⚔️' },
	{ id: 'focus-fire', label: 'Focus-fire', icon: '🎯' },
	{ id: 'flee', label: 'Flee', icon: '🏃' },
	{ id: 'cancel', label: 'Cancel', icon: '✕' },
];

const TABLE: Readonly<Record<SurfaceKind, readonly RadialOption[]>> = Object.freeze({
	floor: FLOOR,
	'wall-world': WALL_WORLD,
	'wall-placed': WALL_PLACED,
	desk: DESK,
	terminal: TERMINAL,
	printer: PRINTER,
	door: DOOR,
	enemy: ENEMY,
});

/** Options for a surface, or empty when there's nothing to do (host
 *  shouldn't open the menu). */
export function optionsFor(kind: SurfaceKind | null): readonly RadialOption[] {
	if (!kind) return [];
	return TABLE[kind] ?? [];
}
