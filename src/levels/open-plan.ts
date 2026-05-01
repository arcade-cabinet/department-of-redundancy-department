import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
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
	{
		id: 'floor-cubicle-field',
		kind: 'floor',
		origin: new Vector3(0, 0, 12),
		yaw: 0,
		width: 24,
		depth: 24,
		pbr: 'carpet',
	},
	{
		id: 'wall-east',
		kind: 'wall',
		origin: new Vector3(12, 0, 12),
		yaw: -Math.PI / 2,
		width: 24,
		height: 3,
		pbr: 'drywall',
	},
	{
		id: 'wall-west',
		kind: 'wall',
		origin: new Vector3(-12, 0, 12),
		yaw: Math.PI / 2,
		width: 24,
		height: 3,
		pbr: 'drywall',
	},
	{
		id: 'wall-end-glass',
		kind: 'wall',
		origin: new Vector3(0, 0, 24),
		yaw: 0,
		width: 24,
		height: 3,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_018.png' },
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
		id: 'p2-spawn-pol-A',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-printer-guard-A',
			archetype: 'security-guard',
			fireProgram: 'vehicle-dismount-burst',
		},
	},
	{
		id: 'p2-spawn-pol-B',
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
		action: { verb: 'audio-stinger', audio: 'stinger/whitcomb-intro.ogg' },
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
		action: { verb: 'audio-stinger', audio: 'stinger/whitcomb-down.ogg' },
	},
	{
		id: 'transition',
		trigger: { kind: 'wall-clock', atMs: 75000 },
		action: { verb: 'transition', toLevelId: 'stairway-B' },
	},
];

export const openPlanLevel: Level = {
	id: 'open-plan',
	displayName: 'Open Plan — Floor 7',
	primitives,
	spawnRails: [
		{
			id: 'rail-spawn-L1',
			path: [new Vector3(-5, 0, 5), new Vector3(-4, 0, 5), new Vector3(-3, 0, 4.5)],
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
			id: 'rail-spawn-R1-vault',
			path: [new Vector3(5, 2.6, 7), new Vector3(5, 0, 7), new Vector3(5, 0, 6)],
			speed: 5.0,
			loop: false,
		},
		{
			id: 'rail-spawn-L2-justice',
			path: [new Vector3(-5, 0, 15), new Vector3(-4, 0, 15), new Vector3(-3, 0, 14.5)],
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
			id: 'rail-spawn-break-room',
			path: [new Vector3(-5, 0, 13), new Vector3(-4, 0, 13), new Vector3(-3, 0, 12.5)],
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
