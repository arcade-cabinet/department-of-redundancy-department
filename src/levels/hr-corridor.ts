import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
import type { Level, Primitive } from './types';

/**
 * Level 05 — HR Corridor. Mirrors docs/spec/levels/05-hr-corridor.md.
 *
 * Long horizontal corridor. Three combat positions: silhouette-read at the
 * frosted-glass doors, a hostage scene with three civilians under duress,
 * and HR Director Phelps (mini-boss). First level with the boss-spawn cue
 * and the hostage-threat fire program.
 *
 * Target time on Normal: 75s.
 */

const cameraRail: RailGraph = {
	defaultSpeedUps: 3,
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
			position: new Vector3(0, 1.6, 6),
			lookAt: new Vector3(-3, 1.6, 4),
			dwellMs: 18000,
		},
		{
			id: 'pos-2-hostage',
			kind: 'combat',
			position: new Vector3(0, 1.6, 14),
			lookAt: new Vector3(3, 1.6, 16),
			dwellMs: 22000,
		},
		{
			id: 'pos-3-phelps',
			kind: 'combat',
			position: new Vector3(0, 1.6, 21),
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

const primitives: Primitive[] = [
	// Floor / ceiling — beige carpet swallowing footsteps; tile ceiling with
	// 8 emissive cutouts (every other one will flicker via cue lighting).
	{
		id: 'floor-corridor',
		kind: 'floor',
		origin: new Vector3(0, 0, 12),
		yaw: 0,
		width: 6,
		depth: 24,
		pbr: 'carpet',
	},
	{
		id: 'ceiling-flicker',
		kind: 'ceiling',
		origin: new Vector3(0, 3, 12),
		yaw: 0,
		width: 6,
		depth: 24,
		height: 3,
		pbr: 'ceiling-tile',
		emissiveCutouts: [
			{ width: 0.6, depth: 1.2, offset: [0, -9], intensity: 0.6, color: [1.0, 1.0, 0.95] },
			{ width: 0.6, depth: 1.2, offset: [0, -6], intensity: 0.6, color: [1.0, 1.0, 0.95] },
			{ width: 0.6, depth: 1.2, offset: [0, -3], intensity: 0.6, color: [1.0, 1.0, 0.95] },
			{ width: 0.6, depth: 1.2, offset: [0, 0], intensity: 0.6, color: [1.0, 1.0, 0.95] },
			{ width: 0.6, depth: 1.2, offset: [0, 3], intensity: 0.6, color: [1.0, 1.0, 0.95] },
			{ width: 0.6, depth: 1.2, offset: [0, 6], intensity: 0.6, color: [1.0, 1.0, 0.95] },
			{ width: 0.6, depth: 1.2, offset: [0, 9], intensity: 0.6, color: [1.0, 1.0, 0.95] },
			{ width: 0.6, depth: 1.2, offset: [0, 12], intensity: 0.6, color: [1.0, 1.0, 0.95] },
		],
	},

	// Side walls (drywall) and end wall with HR DEPARTMENT signage overlay.
	{
		id: 'wall-east',
		kind: 'wall',
		origin: new Vector3(3, 0, 12),
		yaw: -Math.PI / 2,
		width: 24,
		height: 3,
		pbr: 'drywall',
		// HR-corridor mid-pass kit. Phelps's frosted-glass cover game eats
		// HP fast — this is the pre-boss insurance shot. Mounted on the east
		// wall ahead of the Phelps spawn.
		healthKit: { id: 'kit-hr-corridor-east', hp: 35, offset: [-4, 1.4] },
	},
	{
		id: 'wall-west',
		kind: 'wall',
		origin: new Vector3(-3, 0, 12),
		yaw: Math.PI / 2,
		width: 24,
		height: 3,
		pbr: 'drywall',
	},
	{
		id: 'wall-end',
		kind: 'wall',
		origin: new Vector3(0, 0, 24),
		yaw: 0,
		width: 6,
		height: 3,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Vinyl_002.png' },
	},

	// Frosted-glass doors flanking the corridor — silhouettes visible through
	// glass-bricks textures (used here as a stand-in for frosted glass).
	{
		id: 'door-frosted-W1',
		kind: 'door',
		origin: new Vector3(-3, 0, 4),
		yaw: Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Window_GlassBricks_00.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-frosted-W1',
	},
	{
		id: 'door-frosted-E1',
		kind: 'door',
		origin: new Vector3(3, 0, 6),
		yaw: -Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Window_GlassBricks_01.png',
		swing: 'inward',
		state: 'closed',
	},
	{
		id: 'door-frosted-W2',
		kind: 'door',
		origin: new Vector3(-3, 0, 8),
		yaw: Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Window_Vinyl_001.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-frosted-W2',
	},
	{
		id: 'door-frosted-E2',
		kind: 'door',
		origin: new Vector3(3, 0, 10),
		yaw: -Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Window_GlassBricks_00.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-frosted-E2-aggressive',
	},
	{
		id: 'door-frosted-W3',
		kind: 'door',
		origin: new Vector3(-3, 0, 14),
		yaw: Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Window_GlassBricks_01.png',
		swing: 'inward',
		state: 'closed',
	},
	{
		id: 'door-frosted-E3-hostage',
		kind: 'door',
		origin: new Vector3(3, 0, 16),
		yaw: -Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Window_Vinyl_002.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-hostage-host',
	},
	{
		id: 'door-phelps-office',
		kind: 'door',
		origin: new Vector3(0, 0, 24),
		yaw: 0,
		width: 1.2,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_Painted_026.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-phelps',
	},

	// HR motivational whiteboards.
	{
		id: 'wb-hr-mission',
		kind: 'whiteboard',
		origin: new Vector3(-3, 1.5, 11),
		yaw: Math.PI / 2,
		width: 1.6,
		height: 1,
		pbr: 'whiteboard',
		caption: 'HR MISSION: COMPLIANCE',
	},
	{
		id: 'wb-policy-update',
		kind: 'whiteboard',
		origin: new Vector3(3, 1.5, 19),
		yaw: -Math.PI / 2,
		width: 1.6,
		height: 1,
		pbr: 'whiteboard',
		caption: 'POLICY 47.B — REORG ACK FORM',
	},

	// Lights — flickering corridor + Phelps reveal spotlight.
	{
		id: 'light-flicker-A',
		kind: 'light',
		origin: new Vector3(0, 2.8, 6),
		yaw: 0,
		light: 'point',
		color: [1.0, 1.0, 0.95],
		intensity: 0.3,
		range: 6,
	},
	{
		id: 'light-flicker-B',
		kind: 'light',
		origin: new Vector3(0, 2.8, 14),
		yaw: 0,
		light: 'point',
		color: [1.0, 1.0, 0.95],
		intensity: 0.4,
		range: 6,
	},
	{
		id: 'light-phelps-spot',
		kind: 'light',
		origin: new Vector3(0, 2.8, 23),
		yaw: 0,
		light: 'spot',
		color: [1.0, 0.95, 0.85],
		intensity: 0,
		range: 8,
		direction: new Vector3(0, -0.3, -1),
		conicalAngle: 0.7,
	},
	{
		// Without this, the corridor renders pitch-black between the two
		// flicker point-lights, hiding the filing-cabinet rows that line
		// the side walls.
		id: 'light-fill',
		kind: 'light',
		origin: new Vector3(0, 3, 14),
		yaw: 0,
		light: 'hemispheric',
		color: [1.0, 1.0, 0.95],
		intensity: 0.55,
	},

	// Filing-cabinet rows along both side walls — the corridor's signature
	// dressing per docs/spec/levels/05-hr-corridor.md §"Props & lights".
	// Four cabinet-1 along the east wall, four cabinet-2 along the west.
	{
		id: 'prop-cabinet-east-1',
		kind: 'prop',
		origin: new Vector3(2.5, 0, 6),
		yaw: -Math.PI / 2,
		glb: 'props/cabinet-1.glb',
	},
	{
		id: 'prop-cabinet-east-2',
		kind: 'prop',
		origin: new Vector3(2.5, 0, 11),
		yaw: -Math.PI / 2,
		glb: 'props/cabinet-1.glb',
	},
	{
		id: 'prop-cabinet-east-3',
		kind: 'prop',
		origin: new Vector3(2.5, 0, 16),
		yaw: -Math.PI / 2,
		glb: 'props/cabinet-1.glb',
	},
	{
		id: 'prop-cabinet-east-4',
		kind: 'prop',
		origin: new Vector3(2.5, 0, 20),
		yaw: -Math.PI / 2,
		glb: 'props/cabinet-1.glb',
	},
	{
		id: 'prop-cabinet-west-1',
		kind: 'prop',
		origin: new Vector3(-2.5, 0, 6),
		yaw: Math.PI / 2,
		glb: 'props/cabinet-2.glb',
	},
	{
		id: 'prop-cabinet-west-2',
		kind: 'prop',
		origin: new Vector3(-2.5, 0, 11),
		yaw: Math.PI / 2,
		glb: 'props/cabinet-2.glb',
	},
	{
		id: 'prop-cabinet-west-3',
		kind: 'prop',
		origin: new Vector3(-2.5, 0, 16),
		yaw: Math.PI / 2,
		glb: 'props/cabinet-2.glb',
	},
	{
		id: 'prop-cabinet-west-4',
		kind: 'prop',
		origin: new Vector3(-2.5, 0, 20),
		yaw: Math.PI / 2,
		glb: 'props/cabinet-2.glb',
	},
	// Phelps's desk + cover cabinet at the corridor terminus.
	{
		id: 'prop-phelps-desk',
		kind: 'prop',
		origin: new Vector3(0, 0, 23.5),
		yaw: 0,
		glb: 'props/desk.glb',
	},
	{
		id: 'prop-phelps-cover',
		kind: 'prop',
		origin: new Vector3(0, 0, 22),
		yaw: 0,
		glb: 'props/cabinet-3.glb',
	},
];

const cues: Cue[] = [
	// Entry: ambience swap + lights start flickering + floor narrator card.
	{
		id: 'amb-fade',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: {
			verb: 'ambience-fade',
			layerId: 'tense-drone',
			toVolume: 0.6,
			durationMs: 1500,
		},
	},
	{
		id: 'flicker-A',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: {
			verb: 'lighting',
			lightId: 'light-flicker-A',
			tween: { kind: 'flicker', minIntensity: 0.1, maxIntensity: 0.4, hz: 3, durationMs: 75000 },
		},
	},
	{
		id: 'narr-floor',
		trigger: { kind: 'wall-clock', atMs: 300 },
		action: { verb: 'narrator', text: 'HUMAN RESOURCES — FLOOR 19', durationMs: 1500 },
	},

	// Position 1 — frosted-glass silhouette read. Three doors burst over 14s;
	// E1 stays closed but a passive civilian sits behind the frosted glass — the
	// silhouette is the "do not shoot through" discipline test.
	{
		id: 'p1-civ-passive',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'civilian-spawn', railId: 'rail-civ-frosted-E1-passive' },
	},
	{
		id: 'p1-door-W1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'door', doorId: 'door-frosted-W1', to: 'open' },
	},
	{
		id: 'p1-spawn-W1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-frosted-W1',
			archetype: 'hitman',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p1-door-E2',
		trigger: { kind: 'wall-clock', atMs: 10000 },
		action: { verb: 'door', doorId: 'door-frosted-E2', to: 'open' },
	},
	{
		id: 'p1-spawn-E2',
		trigger: { kind: 'wall-clock', atMs: 10000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-frosted-E2-aggressive',
			archetype: 'security-guard',
			fireProgram: 'pistol-cover-pop',
		},
	},
	{
		id: 'p1-door-W2',
		trigger: { kind: 'wall-clock', atMs: 14000 },
		action: { verb: 'door', doorId: 'door-frosted-W2', to: 'open' },
	},
	{
		id: 'p1-spawn-W2',
		trigger: { kind: 'wall-clock', atMs: 14000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-frosted-W2',
			archetype: 'hitman',
			fireProgram: 'pistol-cover-pop',
		},
	},

	// Position 2 — hostage scene. Three civilians staged seated; two enemies
	// must be cleared without civilian-shooting.
	{
		id: 'p2-stinger',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' },
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-bright.mp3' },
	},
	{
		id: 'p2-narr',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' },
		action: { verb: 'narrator', text: 'HOSTAGES', durationMs: 2000 },
	},
	{
		id: 'p2-civ-1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' },
		action: { verb: 'civilian-spawn', railId: 'rail-civ-hostage-1' },
	},
	{
		id: 'p2-civ-2',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' },
		action: { verb: 'civilian-spawn', railId: 'rail-civ-hostage-2' },
	},
	{
		id: 'p2-civ-3',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' },
		action: { verb: 'civilian-spawn', railId: 'rail-civ-hostage-3' },
	},
	{
		id: 'p2-door-host',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' },
		action: { verb: 'door', doorId: 'door-frosted-E3-hostage', to: 'open' },
	},
	{
		id: 'p2-host-spawn-A',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-hostage' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-hostage-host',
			archetype: 'security-guard',
			fireProgram: 'hostage-threat',
		},
	},
	{
		id: 'p2-host-spawn-B',
		trigger: { kind: 'wall-clock', atMs: 30000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-hostage-host-B',
			archetype: 'security-guard',
			fireProgram: 'hostage-threat',
		},
	},
	{
		id: 'p2-charge',
		trigger: { kind: 'wall-clock', atMs: 36000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-corridor-charge',
			archetype: 'hitman',
			fireProgram: 'crawler-lunge',
		},
	},

	// Position 3 — Phelps reveal: power dip, spotlight snap, voice line, file
	// drop, office door swings open, boss enters.
	{
		id: 'p3-power-out',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' },
		action: { verb: 'level-event', event: 'power-out' },
	},
	{
		id: 'p3-spotlight',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' },
		action: {
			verb: 'lighting',
			lightId: 'light-phelps-spot',
			tween: { kind: 'snap', intensity: 1.5 },
		},
	},
	{
		id: 'p3-stinger',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' },
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-bright.mp3' },
	},
	{
		id: 'p3-door',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' },
		action: { verb: 'door', doorId: 'door-phelps-office', to: 'open' },
	},
	{
		id: 'p3-boss',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-phelps' },
		action: { verb: 'boss-spawn', bossId: 'phelps', phase: 1 },
	},
	{
		id: 'p3-phase-2',
		trigger: { kind: 'wall-clock', atMs: 62000 },
		action: { verb: 'boss-phase', bossId: 'phelps', phase: 2 },
	},

	// Cleanup + transition.
	{
		id: 'exit-restore',
		trigger: { kind: 'on-clear', railNodeId: 'pos-3-phelps' },
		action: { verb: 'level-event', event: 'lights-restored' },
	},
	// Transition fires only after the Phelps fight clears, so higher
	// difficulties (where the boss takes longer) don't get cut off.
	{
		id: 'transition',
		trigger: { kind: 'on-clear', railNodeId: 'pos-3-phelps' },
		action: { verb: 'transition', toLevelId: 'stairway-C' },
	},
];

export const hrCorridorLevel: Level = {
	id: 'hr-corridor',
	displayName: 'HR Corridor — Floor 19',
	primitives,
	spawnRails: [
		{
			id: 'rail-spawn-frosted-W1',
			path: [new Vector3(-4, 0, 4), new Vector3(-3, 0, 4), new Vector3(-2, 0, 4.5)],
			speed: 2.0,
			loop: false,
		},
		{
			id: 'rail-spawn-frosted-W2',
			path: [new Vector3(-4, 0, 8), new Vector3(-3, 0, 8), new Vector3(-2, 0, 8.5)],
			speed: 2.0,
			loop: false,
		},
		{
			id: 'rail-spawn-frosted-E2-aggressive',
			path: [new Vector3(4, 0, 10), new Vector3(3, 0, 10), new Vector3(2, 0, 10.5)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-hostage-host',
			path: [new Vector3(4, 0, 16), new Vector3(3, 0, 16), new Vector3(2.2, 0, 16)],
			speed: 2.0,
			loop: false,
		},
		{
			id: 'rail-spawn-hostage-host-B',
			path: [new Vector3(4, 0, 16.5), new Vector3(3, 0, 16.5), new Vector3(2.2, 0, 16.5)],
			speed: 2.0,
			loop: false,
		},
		{
			id: 'rail-spawn-corridor-charge',
			path: [new Vector3(0, 0, 26), new Vector3(0, 0, 22), new Vector3(0, 0, 18)],
			speed: 3.0,
			loop: false,
		},
		{
			id: 'rail-spawn-phelps',
			path: [new Vector3(0, 0, 25), new Vector3(0, 0, 23.5), new Vector3(0, 0, 22.5)],
			speed: 1.5,
			loop: false,
		},
	],
	civilianRails: [
		// Behind frosted-glass door E1 at Pos 1 — silhouette-only passive
		// civilian. The discipline test: don't shoot through frosted glass at
		// a non-aggressive silhouette pose.
		{
			id: 'rail-civ-frosted-E1-passive',
			path: [new Vector3(3.5, 0, 6), new Vector3(3.2, 0, 6)],
			speed: 0.05,
			archetype: 'intern',
		},
		{
			id: 'rail-civ-hostage-1',
			path: [new Vector3(3.5, 0, 16), new Vector3(3, 0, 16)],
			speed: 0.1,
			archetype: 'consultant',
		},
		{
			id: 'rail-civ-hostage-2',
			path: [new Vector3(3.5, 0, 16.5), new Vector3(3, 0, 16.5)],
			speed: 0.1,
			archetype: 'intern',
		},
		{
			id: 'rail-civ-hostage-3',
			path: [new Vector3(3.5, 0, 17), new Vector3(3, 0, 17)],
			speed: 0.1,
			archetype: 'consultant',
		},
	],
	ambienceLayers: [
		{
			id: 'tense-drone',
			audio: 'ambience/ambience-tense-drone.ogg',
			volume: 0.6,
			loop: true,
		},
	],
	cameraRail,
	cues,
};
