import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
import { ceiling, floor, wall } from './builders';
import type { Level, Primitive } from './types';

/**
 * Level 03 — The Open Plan. Mirrors docs/spec/levels/03-open-plan.md.
 *
 * Cubicle sea, 6×4 cells. Three combat positions:
 *   pos-1 — opening row     (18s)  vault-drop tempo
 *   pos-2 — printer alley   (22s)  vehicle-entry beat + first justice-glint
 *   pos-3 — Whitcomb (boss) (22s)  first mini-boss
 *
 * Target time on Normal: 75s.
 */

const cameraRail: RailGraph = {
	defaultSpeedUps: 4,
	nodes: [
		{
			id: 'enter',
			kind: 'glide',
			position: new Vector3(0, 1.6, 0),
			lookAt: new Vector3(0, 1.6, 4),
		},
		{
			id: 'pos-1',
			kind: 'combat',
			position: new Vector3(0, 1.6, 5),
			lookAt: new Vector3(-3, 1.6, 6),
			dwellMs: 18000,
		},
		{
			id: 'pos-2',
			kind: 'combat',
			position: new Vector3(0, 1.6, 12),
			lookAt: new Vector3(4, 1.6, 12),
			dwellMs: 22000,
		},
		{
			id: 'pos-3',
			kind: 'combat',
			position: new Vector3(0, 1.6, 21),
			lookAt: new Vector3(0, 1.6, 24),
			dwellMs: 22000,
		},
		{
			id: 'exit',
			kind: 'glide',
			position: new Vector3(0, 1.6, 23.5),
			lookAt: new Vector3(0, 1.6, 25),
		},
	],
};

const primitives: Primitive[] = [
	// Floor + perimeter walls.
	floor({
		id: 'floor-cubicle-field',
		origin: new Vector3(0, 0, 12),
		width: 24,
		depth: 24,
		pbr: 'carpet',
	}),
	wall({
		id: 'wall-east',
		origin: new Vector3(12, 0, 12),
		yaw: -Math.PI / 2,
		width: 24,
		height: 3,
	}),
	wall({
		id: 'wall-west',
		origin: new Vector3(-12, 0, 12),
		yaw: Math.PI / 2,
		width: 24,
		height: 3,
		// Authored health kit on the west wall — picked up between the
		// office-cluster ambushes per docs/spec/06-economy.md pacing.
		healthKit: { id: 'kit-open-plan-west', hp: 35, offset: [4, 1.4] },
	}),
	wall({
		id: 'wall-end-glass',
		origin: new Vector3(0, 0, 24),
		yaw: 0,
		width: 24,
		height: 3,
		overlay: { texture: 'T_Window_Wood_018.png' },
	}),
	// Entry-side wall closes the south end of the cubicle field. Without
	// this the camera looking back at entry sees void.
	wall({
		id: 'wall-entry',
		origin: new Vector3(0, 0, 0),
		yaw: Math.PI,
		width: 24,
		height: 3,
	}),
	// Open-plan ceiling — flat 3m drop-tile with a 6×6 grid of cool-white
	// emissive cutouts per docs/spec/levels/03-open-plan.md §"Floors /
	// ceiling" so the field reads as fluorescent-lit, not a dark cavern.
	ceiling({
		id: 'ceiling-cubicle-field',
		origin: new Vector3(0, 0, 12),
		width: 24,
		depth: 24,
		height: 3,
		emissiveCutouts: [
			{ width: 1.2, depth: 1.2, offset: [-8, -8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [-4, -8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [0, -8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [4, -8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [8, -8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [-8, -4], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [-4, -4], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [0, -4], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [4, -4], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [8, -4], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [-8, 0], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [-4, 0], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [0, 0], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [4, 0], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [8, 0], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [-8, 4], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [-4, 4], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [0, 4], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [4, 4], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [8, 4], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [-8, 8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [-4, 8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [0, 8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [4, 8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.2, depth: 1.2, offset: [8, 8], intensity: 0.7, color: [1, 1, 0.95] },
		],
	}),
	{
		id: 'light-fill',
		kind: 'light',
		origin: new Vector3(0, 2.5, 12),
		yaw: 0,
		light: 'hemispheric',
		color: [1.0, 1.0, 0.95],
		// 0.7 to read with the new ceiling-tile emissive grid; 0.4 was too
		// dim and rendered the carpet as near-black.
		intensity: 0.7,
	},

	// Whiteboards — readable plants for tone + boss-office signage.
	{
		id: 'wb-q1-goals',
		kind: 'whiteboard',
		origin: new Vector3(-12, 1, 4),
		yaw: Math.PI / 2,
		width: 4,
		height: 1.5,
		pbr: 'whiteboard',
		caption: 'GOALS Q1 2026: SYNERGY ACTUALIZATION',
	},
	{
		id: 'wb-okrs',
		kind: 'whiteboard',
		origin: new Vector3(12, 1, 8),
		yaw: -Math.PI / 2,
		width: 4,
		height: 1.5,
		pbr: 'whiteboard',
		caption: 'OKR ALIGNMENT — H2',
	},
	{
		id: 'wb-whitcomb-self',
		kind: 'whiteboard',
		origin: new Vector3(-3, 1, 23),
		yaw: 0,
		width: 6,
		height: 1.5,
		pbr: 'whiteboard',
		caption: 'WHITCOMB',
	},

	// Doors.
	{
		id: 'door-cubicle-L1',
		kind: 'door',
		origin: new Vector3(-4, 0, 4),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'painted-wood',
		texture: 'T_Door_PaintedWood_011.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-L1',
	},
	{
		id: 'door-cubicle-R1',
		kind: 'door',
		origin: new Vector3(4, 0, 6),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'painted-wood',
		texture: 'T_Door_PaintedWood_007.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-R1-vault',
	},
	{
		id: 'door-break-room',
		kind: 'door',
		origin: new Vector3(-4, 0, 12),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_009.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-break-room',
	},
	{
		id: 'door-cubicle-L2',
		kind: 'door',
		origin: new Vector3(-4, 0, 14),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'painted-wood',
		texture: 'T_Door_PaintedWood_018.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-L2-justice',
	},
	{
		id: 'door-whitcomb-office',
		kind: 'door',
		origin: new Vector3(0, 0, 24),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_026.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-whitcomb',
	},

	// Cubicle furniture — desks scattered through the field. The spec calls
	// for 15 cubicle dividers + per-cubicle desks; without them the field
	// reads as a bare carpet box. Spec at docs/spec/levels/03-open-plan.md
	// §"Props & lights" + §"Cubicle dividers".
	{
		id: 'prop-cubicle-desk-L1',
		kind: 'prop',
		origin: new Vector3(-4, 0, 5),
		yaw: 0,
		glb: 'props/desk.glb',
	},
	{
		id: 'prop-cubicle-desk-R1',
		kind: 'prop',
		origin: new Vector3(4, 0, 6),
		yaw: Math.PI,
		glb: 'props/desk.glb',
	},
	{
		id: 'prop-cubicle-desk-L2',
		kind: 'prop',
		origin: new Vector3(-4, 0, 14),
		yaw: 0,
		glb: 'props/desk.glb',
	},
	{
		id: 'prop-cubicle-desk-R2',
		kind: 'prop',
		origin: new Vector3(4, 0, 14),
		yaw: Math.PI,
		glb: 'props/desk.glb',
	},
	{
		id: 'prop-cubicle-cabinet-mid-L',
		kind: 'prop',
		origin: new Vector3(-6, 0, 12),
		yaw: Math.PI / 2,
		glb: 'props/cabinet-1.glb',
	},
	{
		id: 'prop-cubicle-cabinet-mid-R',
		kind: 'prop',
		origin: new Vector3(6, 0, 12),
		yaw: -Math.PI / 2,
		glb: 'props/cabinet-2.glb',
	},
	{
		id: 'prop-whitcomb-desk',
		kind: 'prop',
		origin: new Vector3(0, 0, 23),
		yaw: 0,
		glb: 'props/desk.glb',
		scale: 1.2,
	},

	// Lights.
	{
		id: 'light-fluo-fill',
		kind: 'light',
		origin: new Vector3(0, 3, 12),
		yaw: 0,
		light: 'hemispheric',
		color: [1.0, 1.0, 0.95],
		intensity: 0.5,
	},
	{
		id: 'light-whitcomb-spot',
		kind: 'light',
		origin: new Vector3(0, 2.5, 23),
		yaw: 0,
		light: 'spot',
		color: [1.0, 0.95, 0.85],
		intensity: 0,
		range: 6,
		direction: new Vector3(0, 0, -1),
		conicalAngle: 0.7,
	},
];

const cues: Cue[] = [
	{
		id: 'amb-radio',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: { verb: 'ambience-fade', layerId: 'radio-chatter', toVolume: 0.7, durationMs: 1000 },
	},
	{
		id: 'narr-floor',
		trigger: { kind: 'wall-clock', atMs: 300 },
		action: { verb: 'narrator', text: 'OPEN PLAN — FLOOR 7', durationMs: 1500 },
	},

	// Position 1 — opening row.
	{
		id: 'p1-door-L1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'door', doorId: 'door-cubicle-L1', to: 'open' },
	},
	{
		id: 'p1-spawn-L1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-L1',
			archetype: 'security-guard',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p1-spawn-shamble',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-shamble-far',
			archetype: 'middle-manager',
			fireProgram: 'shamble-march',
		},
	},
	{
		id: 'p1-door-R1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'door', doorId: 'door-cubicle-R1', to: 'open' },
	},
	{
		id: 'p1-spawn-R1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-R1-vault',
			archetype: 'middle-manager',
			fireProgram: 'vault-drop-fire',
		},
	},
	{
		id: 'p1-spawn-cover',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-L1',
			archetype: 'security-guard',
			fireProgram: 'pistol-cover-pop',
		},
	},

	// Position 2 — printer alley.
	{
		id: 'p2-civ',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: { verb: 'civilian-spawn', railId: 'rail-civ-consultant' },
	},
	{
		id: 'p2-printer-anim',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: { verb: 'prop-anim', propId: 'prop-printer-dolly', animId: 'roll-in' },
	},
	{
		id: 'p2-spawn-guard-A',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-printer-guard-A',
			archetype: 'security-guard',
			fireProgram: 'vehicle-dismount-burst',
		},
	},
	{
		id: 'p2-spawn-guard-B',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-printer-guard-B',
			archetype: 'security-guard',
			fireProgram: 'vehicle-dismount-burst',
		},
	},
	{
		id: 'p2-door-break',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: { verb: 'door', doorId: 'door-break-room', to: 'open' },
	},
	{
		id: 'p2-spawn-break',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-break-room',
			archetype: 'middle-manager',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-door-justice',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: { verb: 'door', doorId: 'door-cubicle-L2', to: 'open' },
	},
	{
		id: 'p2-spawn-justice',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-L2-justice',
			archetype: 'middle-manager',
			fireProgram: 'justice-glint',
		},
	},

	// Position 3 — Whitcomb mini-boss.
	{
		id: 'p3-coffee-shatter',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3' },
		action: { verb: 'prop-anim', propId: 'prop-coffee-mug', animId: 'shatter' },
	},
	{
		id: 'p3-stinger',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3' },
		// Bespoke whitcomb-intro.ogg is a future asset slice; fall back to a
		// shipped bright stinger so the cue actually plays at runtime.
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-bright.mp3' },
	},
	{
		id: 'p3-spotlight',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3' },
		action: {
			verb: 'lighting',
			lightId: 'light-whitcomb-spot',
			tween: { kind: 'snap', intensity: 1.5 },
		},
	},
	{
		id: 'p3-door-whitcomb',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3' },
		action: { verb: 'door', doorId: 'door-whitcomb-office', to: 'open' },
	},
	{
		id: 'p3-boss',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3' },
		action: { verb: 'boss-spawn', bossId: 'whitcomb', phase: 1 },
	},

	// Exit.
	{
		id: 'exit-stinger',
		trigger: { kind: 'on-clear', railNodeId: 'pos-3' },
		// Bespoke whitcomb-down.ogg is a future asset slice; reuse the
		// shipped boss-cleared stinger so the cue plays at runtime.
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-boss-cleared.mp3' },
	},
	{
		// On-clear of the Whitcomb fight (pos-3 boss-spawn → boss-kill →
		// dwell empties → on-clear). Wall-clock atMs:75000 pre-dated PR#66
		// and assumed the broken instant-resume dwell.
		id: 'transition',
		trigger: { kind: 'on-clear', railNodeId: 'pos-3' },
		action: { verb: 'transition', toLevelId: 'stairway-B' },
	},
];

export const openPlanLevel: Level = {
	id: 'open-plan',
	displayName: 'Open Plan — Floor 7',
	primitives,
	spawnRails: [
		{
			// Cubicle door at (-4, 0, 4). Enemy walks forward into camera
			// frustum (camera at pos-1 z=5 looking toward z=6) instead of
			// terminating behind/below the camera lookAt at z=4.5 — the
			// same fix-pattern as PR #64 for lobby.
			id: 'rail-spawn-L1',
			path: [new Vector3(-4.5, 0, 4.2), new Vector3(-3.5, 0, 6), new Vector3(-3, 0, 8)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-shamble-far',
			path: [new Vector3(0, 0, 22), new Vector3(0, 0, 12)],
			speed: 1.0,
			loop: false,
		},
		{
			// Vault from cubicle wall at z=6, dropping in from above. Final
			// waypoint at (3, 0, 7) keeps the enemy in pos-1 frustum (cam
			// at (0, 1.6, 5) looking toward (-3, 1.6, 6); the FOV cone
			// includes positive-x out to ~z=8).
			id: 'rail-spawn-R1-vault',
			path: [new Vector3(5, 2.6, 7), new Vector3(4, 0, 7), new Vector3(3, 0, 7)],
			speed: 5.0,
			loop: false,
		},
		{
			// Cubicle door at (-4, 0, 14). Camera pos-2 at (0, 1.6, 12)
			// looks toward (4, 1.6, 12) — pos-2 is the printer-dolly fight
			// on the +x side. Move L2 endpoint forward+right so it doesn't
			// clip the camera at z=12.
			id: 'rail-spawn-L2-justice',
			path: [new Vector3(-4.5, 0, 14.2), new Vector3(-3, 0, 13.5), new Vector3(-1, 0, 12.5)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-printer-dolly',
			path: [new Vector3(12, 0.5, 12), new Vector3(5, 0.5, 12)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-printer-guard-A',
			path: [new Vector3(4, 0, 12), new Vector3(3, 0, 11)],
			speed: 1.5,
			loop: false,
		},
		{
			id: 'rail-spawn-printer-guard-B',
			path: [new Vector3(4, 0, 12), new Vector3(3, 0, 13)],
			speed: 1.5,
			loop: false,
		},
		{
			// Break-room door spawn — same pos-2 fight; keep in-frustum on
			// the right side so it reads as a flanker.
			id: 'rail-spawn-break-room',
			path: [new Vector3(-4.5, 0, 12.8), new Vector3(-2, 0, 12), new Vector3(1, 0, 11.5)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-whitcomb',
			path: [new Vector3(0, 0, 25), new Vector3(0, 0, 23.5)],
			speed: 2.0,
			loop: false,
		},
	],
	civilianRails: [
		{
			id: 'rail-civ-consultant',
			path: [new Vector3(-12, 0, 12.5), new Vector3(12, 0, 12.5)],
			speed: 0.7,
			archetype: 'consultant',
		},
	],
	ambienceLayers: [
		{ id: 'radio-chatter', audio: 'ambience/ambience-radio-chatter.ogg', volume: 0, loop: true },
	],
	cameraRail,
	cues,
};
