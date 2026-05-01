import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
import type { Level, Primitive } from './types';

const PI_2 = Math.PI / 2;

/**
 * Level 01 — The Lobby. Mirrors docs/spec/levels/01-lobby.md screenplay.
 *
 * Cell size 4m. Ceiling height 6m (atrium). Camera height 1.6m.
 * Coordinate frame: rail enters along +Z at (0, 1.6, 0).
 */

const cameraRail: RailGraph = {
	defaultSpeedUps: 4,
	nodes: [
		{
			id: 'enter',
			kind: 'glide',
			position: new Vector3(0, 1.6, 0.5),
			lookAt: new Vector3(0, 1.6, 4),
		},
		{
			id: 'pos-1',
			kind: 'combat',
			position: new Vector3(0, 1.6, 5),
			lookAt: new Vector3(-2, 1.6, 8),
			dwellMs: 18000,
		},
		{
			id: 'pos-2',
			kind: 'combat',
			position: new Vector3(0, 1.6, 12),
			lookAt: new Vector3(4, 1.6, 14),
			dwellMs: 22000,
		},
		{
			id: 'pos-3',
			kind: 'combat',
			position: new Vector3(0, 1.6, 20),
			lookAt: new Vector3(0, 1.6, 24),
			dwellMs: 22000,
		},
		{
			id: 'exit',
			kind: 'glide',
			position: new Vector3(0, 1.6, 23),
			lookAt: new Vector3(0, 1.6, 25),
		},
	],
};

const cues: readonly Cue[] = [
	{
		id: 'amb-radio',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: { verb: 'ambience-fade', layerId: 'managers-only', toVolume: 0.55, durationMs: 1000 },
	},
	{
		id: 'narr-floor',
		trigger: { kind: 'wall-clock', atMs: 300 },
		action: { verb: 'narrator', text: 'LOBBY — FLOOR 1', durationMs: 1500 },
	},
	{
		id: 'door-revolving',
		trigger: { kind: 'wall-clock', atMs: 500 },
		action: { verb: 'door', doorId: 'door-revolving', to: 'open' },
	},

	// Position 1
	{
		id: 'p1-tut-aim',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'narrator', text: 'DRAG TO AIM', durationMs: 2000 },
	},
	{
		id: 'p1-door-A',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'door', doorId: 'door-reception-side-A', to: 'open' },
	},
	{
		id: 'p1-spawn-A',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-reception-A',
			archetype: 'middle-manager',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p1-spawn-cover',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-side-1',
			archetype: 'middle-manager',
			fireProgram: 'pistol-cover-pop',
		},
	},

	// Position 2
	{
		id: 'p2-amb-bump',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: { verb: 'ambience-fade', layerId: 'managers-only', toVolume: 0.7, durationMs: 800 },
	},
	{
		id: 'p2-door-N',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: { verb: 'door', doorId: 'door-north-wing', to: 'open' },
	},
	{
		id: 'p2-spawn-N',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-north-wing',
			archetype: 'middle-manager',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-door-S',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: { verb: 'door', doorId: 'door-south-wing', to: 'open' },
	},
	{
		id: 'p2-spawn-S',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-south-wing',
			archetype: 'middle-manager',
			fireProgram: 'pistol-cover-pop',
		},
	},
	{
		id: 'p2-civ-intern',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: { verb: 'civilian-spawn', railId: 'rail-civ-intern' },
	},
	{
		id: 'p2-vault',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vault-couch',
			archetype: 'middle-manager',
			fireProgram: 'vault-drop-fire',
		},
	},

	// Position 3 — Garrison
	{
		id: 'p3-elevator-ding',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3' },
		action: { verb: 'audio-stinger', audio: 'ui/ui-notification.mp3' },
	},
	{
		id: 'p3-elevator-door',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3' },
		action: { verb: 'door', doorId: 'door-elevator-B', to: 'open' },
	},
	{
		id: 'p3-clipboard',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3' },
		action: { verb: 'prop-anim', propId: 'prop-clipboard', animId: 'drop' },
	},
	{
		id: 'p3-spotlight',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3' },
		action: {
			verb: 'lighting',
			lightId: 'light-elevator-spot-B',
			tween: { kind: 'snap', intensity: 1.5 },
		},
	},
	{
		id: 'p3-boss-spawn',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3' },
		action: { verb: 'boss-spawn', bossId: 'garrison', phase: 1 },
	},

	// Exit
	{
		id: 'exit-stinger',
		trigger: { kind: 'on-clear', railNodeId: 'pos-3' },
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-boss-cleared.mp3' },
	},
	{
		id: 'exit-elevator-A',
		trigger: { kind: 'on-clear', railNodeId: 'pos-3' },
		action: { verb: 'door', doorId: 'door-elevator-A', to: 'open' },
	},
	{
		id: 'transition',
		trigger: { kind: 'wall-clock', atMs: 73000 },
		action: { verb: 'transition', toLevelId: 'stairway-A' },
	},
];

// Construction primitives — anchored to docs/spec/levels/01-lobby.md.
// Walls run along ±X (face inward toward x=0). Floor is 12m × 24m.
// Primitive plane normals are -Z by default; yaw rotates around +Y.
const primitives: readonly Primitive[] = [
	// Floor + ceiling
	{
		kind: 'floor',
		id: 'floor-marble',
		origin: new Vector3(0, 0, 12),
		yaw: 0,
		width: 12,
		depth: 24,
		pbr: 'laminate',
	},
	{
		kind: 'ceiling',
		id: 'ceiling-atrium',
		origin: new Vector3(0, 0, 12),
		yaw: 0,
		width: 12,
		depth: 24,
		pbr: 'ceiling-tile',
		height: 6,
		emissiveCutouts: [
			{ width: 1.5, depth: 1.5, offset: [-3, -8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.5, depth: 1.5, offset: [3, -8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.5, depth: 1.5, offset: [-3, 0], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.5, depth: 1.5, offset: [3, 0], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.5, depth: 1.5, offset: [-3, 8], intensity: 0.7, color: [1, 1, 0.95] },
			{ width: 1.5, depth: 1.5, offset: [3, 8], intensity: 0.7, color: [1, 1, 0.95] },
		],
	},

	// Walls (east faces -X, west faces +X, end faces -Z)
	{
		kind: 'wall',
		id: 'wall-east-1',
		origin: new Vector3(6, 0, 4),
		yaw: -PI_2,
		width: 8,
		height: 6,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_GlassBricks_00.png' },
	},
	{
		kind: 'wall',
		id: 'wall-east-2',
		origin: new Vector3(6, 0, 12),
		yaw: -PI_2,
		width: 8,
		height: 6,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_GlassBricks_01.png' },
	},
	{
		kind: 'wall',
		id: 'wall-east-3',
		origin: new Vector3(6, 0, 20),
		yaw: -PI_2,
		width: 8,
		height: 6,
		pbr: 'drywall',
		// Authored health kit at the east-corridor wall — pacing beat between
		// the second wave and the boss elevator. Per docs/spec/06-economy.md.
		healthKit: { id: 'kit-lobby-east', hp: 35, offset: [0, 1.4] },
	},
	{
		kind: 'wall',
		id: 'wall-west-1',
		origin: new Vector3(-6, 0, 4),
		yaw: PI_2,
		width: 8,
		height: 6,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_012.png' },
	},
	{
		kind: 'wall',
		id: 'wall-west-2',
		origin: new Vector3(-6, 0, 12),
		yaw: PI_2,
		width: 8,
		height: 6,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_018.png' },
	},
	{
		kind: 'wall',
		id: 'wall-west-3',
		origin: new Vector3(-6, 0, 20),
		yaw: PI_2,
		width: 8,
		height: 6,
		pbr: 'drywall',
	},
	{
		kind: 'wall',
		id: 'wall-end',
		origin: new Vector3(0, 0, 24),
		yaw: Math.PI,
		width: 12,
		height: 6,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_019.png' },
	},

	// Doors
	{
		kind: 'door',
		id: 'door-revolving',
		origin: new Vector3(0, 0, 0),
		yaw: 0,
		width: 2,
		height: 2.4,
		texture: 'T_Door_Wood_Painted_028.png',
		family: 'painted-wood',
		state: 'closed',
		swing: 'inward',
		hingedOn: 'left',
	},
	{
		kind: 'door',
		id: 'door-reception-side-A',
		origin: new Vector3(-3, 0, 4),
		yaw: PI_2,
		width: 1,
		height: 2.2,
		texture: 'T_Door_Wood_005.png',
		family: 'wood',
		state: 'closed',
		swing: 'inward',
		hingedOn: 'left',
		spawnRailId: 'rail-spawn-reception-A',
	},
	{
		kind: 'door',
		id: 'door-side-cubicle-1',
		origin: new Vector3(3, 0, 6),
		yaw: -PI_2,
		width: 1,
		height: 2.2,
		texture: 'T_Door_Wood_Painted_011.png',
		family: 'painted-wood',
		state: 'closed',
		swing: 'inward',
		hingedOn: 'right',
		spawnRailId: 'rail-spawn-side-1',
	},
	{
		kind: 'door',
		id: 'door-north-wing',
		origin: new Vector3(-6, 0, 12),
		yaw: PI_2,
		width: 1,
		height: 2.2,
		texture: 'T_Door_Wood_012.png',
		family: 'wood',
		state: 'closed',
		swing: 'outward',
		hingedOn: 'left',
		spawnRailId: 'rail-spawn-north-wing',
	},
	{
		kind: 'door',
		id: 'door-south-wing',
		origin: new Vector3(6, 0, 12),
		yaw: -PI_2,
		width: 1,
		height: 2.2,
		texture: 'T_Door_Wood_Painted_007.png',
		family: 'painted-wood',
		state: 'closed',
		swing: 'outward',
		hingedOn: 'right',
		spawnRailId: 'rail-spawn-south-wing',
	},
	{
		kind: 'door',
		id: 'door-elevator-A',
		origin: new Vector3(-2, 0, 24),
		yaw: Math.PI,
		width: 1,
		height: 2.4,
		texture: 'T_LiftDoor_00.png',
		family: 'lift',
		state: 'closed',
		swing: 'slide-left',
	},
	{
		kind: 'door',
		id: 'door-elevator-B',
		origin: new Vector3(0, 0, 24),
		yaw: Math.PI,
		width: 1,
		height: 2.4,
		texture: 'T_LiftDoor_00.png',
		family: 'lift',
		state: 'closed',
		swing: 'slide-left',
		spawnRailId: 'rail-spawn-elevator-garrison',
	},
	{
		kind: 'door',
		id: 'door-elevator-C',
		origin: new Vector3(2, 0, 24),
		yaw: Math.PI,
		width: 1,
		height: 2.4,
		texture: 'T_LiftDoor_00.png',
		family: 'lift',
		state: 'closed',
		swing: 'slide-left',
	},

	// Pillars
	{
		kind: 'pillar',
		id: 'pillar-N-1',
		origin: new Vector3(-3, 0, 16),
		yaw: 0,
		shape: 'round',
		size: 0.6,
		height: 6,
		pbr: 'drywall',
	},
	{
		kind: 'pillar',
		id: 'pillar-N-2',
		origin: new Vector3(3, 0, 16),
		yaw: 0,
		shape: 'round',
		size: 0.6,
		height: 6,
		pbr: 'drywall',
	},

	// Props (only those whose GLBs exist)
	{
		kind: 'prop',
		id: 'prop-reception-desk',
		origin: new Vector3(-2, 0, 4),
		yaw: 0,
		glb: 'props/desk.glb',
		scale: 1.2,
	},
	{
		kind: 'prop',
		id: 'prop-cabinet-N',
		origin: new Vector3(-4, 0, 16),
		yaw: 0,
		glb: 'props/cabinet-1.glb',
	},
	{
		kind: 'prop',
		id: 'prop-cabinet-S',
		origin: new Vector3(4, 0, 16),
		yaw: Math.PI,
		glb: 'props/cabinet-2.glb',
	},

	// Lights
	{
		kind: 'light',
		id: 'light-fluorescent-fill',
		origin: new Vector3(0, 6, 12),
		yaw: 0,
		light: 'hemispheric',
		color: [1.0, 1.0, 0.95],
		intensity: 0.4,
	},
	{
		kind: 'light',
		id: 'light-revolving-door-spot',
		origin: new Vector3(0, 4, 1),
		yaw: 0,
		light: 'spot',
		color: [0.95, 0.95, 1.0],
		intensity: 1.2,
		direction: new Vector3(0, -0.5, 1),
		conicalAngle: 1.0,
		range: 12,
	},
	{
		kind: 'light',
		id: 'light-elevator-spot-B',
		origin: new Vector3(0, 4, 23.5),
		yaw: 0,
		light: 'spot',
		color: [1.0, 0.95, 0.85],
		intensity: 0.0, // dim until p3-spotlight cue snaps it to 1.5
		direction: new Vector3(0, -0.5, -1),
		conicalAngle: 0.6,
		range: 8,
	},
];

export const lobbyLevel: Level = {
	id: 'lobby',
	displayName: 'Lobby — Floor 1',
	primitives,
	spawnRails: [
		{
			// Reception side door at (-3, 0, 4). Enemy enters the door, walks
			// FORWARD into the camera's frustum so they're visible from pos-1
			// (camera at z=5 looking at lookAt z=8). Final waypoint sits at
			// (-2, 0, 8) — in front of the camera, in the lookAt cone.
			id: 'rail-spawn-reception-A',
			path: [new Vector3(-3.5, 0, 4.2), new Vector3(-3, 0, 6), new Vector3(-2, 0, 8)],
			speed: 2.5,
			loop: false,
		},
		{
			// Side cubicle door at (3, 0, 6). Enemy emerges and walks across
			// to z=8 area where pos-1 is looking (lookAt -2, 1.6, 8 — but the
			// frustum is wide enough that x=1, z=9 is visible too).
			id: 'rail-spawn-side-1',
			path: [new Vector3(3.5, 0, 6.2), new Vector3(2.5, 0, 8), new Vector3(1, 0, 9)],
			speed: 3.0,
			loop: false,
		},
		{
			id: 'rail-spawn-north-wing',
			path: [new Vector3(-7, 0, 12), new Vector3(-6, 0, 12), new Vector3(-4, 0, 12)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-south-wing',
			path: [new Vector3(7, 0, 12), new Vector3(6, 0, 12), new Vector3(4, 0, 12)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-vault-couch',
			path: [new Vector3(4, 2.6, 13), new Vector3(4, 0, 13), new Vector3(4, 0, 12)],
			speed: 5.0,
			loop: false,
		},
		{
			id: 'rail-spawn-elevator-garrison',
			path: [new Vector3(0, 0, 25), new Vector3(0, 0, 24), new Vector3(0, 0, 22)],
			speed: 2.0,
			loop: false,
		},
	],
	civilianRails: [
		{
			id: 'rail-civ-intern',
			path: [new Vector3(-7, 0, 12.5), new Vector3(7, 0, 12.5)],
			speed: 0.7,
			archetype: 'intern',
		},
	],
	ambienceLayers: [
		// Starts silent; the wall-clock 0ms ambience-fade cue ramps to 0.55 over 1s.
		{ id: 'managers-only', audio: 'ambience/ambience-managers-only.ogg', volume: 0, loop: true },
	],
	cameraRail,
	cues,
};
