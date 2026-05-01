import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
import type { Level, Primitive } from './types';

/**
 * Level 07 — Executive Suites. Mirrors docs/spec/levels/07-executive-suites.md.
 *
 * Top-floor executive level. Three combat positions: outer reception (mass-pop +
 * shutter-cabinet), executive lounge (first pre-aggro beat — enemies visible
 * before alert + first ceiling-vent drop), and Director-of-Ops Crawford
 * (silent boss with shotgun, two-phase desk-flip mechanic). Panic alarm
 * strobes red globally. Boardroom is foreshadowed through frosted glass.
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
			position: new Vector3(0, 1.6, 5),
			lookAt: new Vector3(-3, 1.6, 5),
			dwellMs: 18000,
		},
		{
			id: 'pos-2-lounge',
			kind: 'combat',
			position: new Vector3(0, 1.6, 11),
			lookAt: new Vector3(0, 1.6, 14),
			dwellMs: 22000,
		},
		{
			id: 'pos-3-crawford',
			kind: 'combat',
			position: new Vector3(0, 1.6, 20),
			lookAt: new Vector3(0, 1.6, 26),
			dwellMs: 22000,
		},
		{
			id: 'exit',
			kind: 'glide',
			position: new Vector3(0, 1.6, 22),
			lookAt: new Vector3(0, 1.6, 24),
		},
	],
};

const primitives: Primitive[] = [
	// Floors — mahogany-tinted laminate stand-ins.
	{
		id: 'floor-reception',
		kind: 'floor',
		origin: new Vector3(0, 0, 4),
		yaw: 0,
		width: 8,
		depth: 8,
		pbr: 'laminate',
	},
	{
		id: 'floor-lounge',
		kind: 'floor',
		origin: new Vector3(0, 0, 12),
		yaw: 0,
		width: 12,
		depth: 8,
		pbr: 'laminate',
	},
	{
		id: 'floor-crawford-office',
		kind: 'floor',
		origin: new Vector3(0, 0, 22),
		yaw: 0,
		width: 12,
		depth: 8,
		pbr: 'laminate',
	},

	// Executive ceiling — 12 emissive cutouts; panic-strobe overlay tint
	// driven by the lighting cue rather than per-cutout color.
	{
		id: 'ceiling-exec',
		kind: 'ceiling',
		origin: new Vector3(0, 3, 12),
		yaw: 0,
		width: 12,
		depth: 32,
		height: 3,
		pbr: 'ceiling-tile',
		emissiveCutouts: [
			{ width: 0.6, depth: 1.0, offset: [-3, -10], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [3, -10], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [-3, -6], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [3, -6], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [-3, -2], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [3, -2], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [-3, 2], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [3, 2], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [-3, 6], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [3, 6], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [-3, 10], intensity: 0.5, color: [1.0, 0.95, 0.85] },
			{ width: 0.6, depth: 1.0, offset: [3, 10], intensity: 0.5, color: [1.0, 0.95, 0.85] },
		],
	},

	// Side walls + frosted-glass partition into the lounge + Crawford end-wall.
	{
		id: 'wall-N',
		kind: 'wall',
		origin: new Vector3(-6, 0, 14),
		yaw: Math.PI / 2,
		width: 32,
		height: 3,
		pbr: 'drywall',
	},
	{
		id: 'wall-S',
		kind: 'wall',
		origin: new Vector3(6, 0, 14),
		yaw: -Math.PI / 2,
		width: 32,
		height: 3,
		pbr: 'drywall',
	},
	{
		id: 'wall-lounge-frosted',
		kind: 'wall',
		origin: new Vector3(0, 0, 18),
		yaw: 0,
		width: 12,
		height: 3,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_GlassBricks_01.png' },
	},
	{
		id: 'wall-end-crawford',
		kind: 'wall',
		origin: new Vector3(0, 0, 30),
		yaw: 0,
		width: 12,
		height: 3,
		pbr: 'drywall',
		overlay: { texture: 'T_Door_Wood_Painted_026.png' },
	},

	// Doors — reception flanks, lounge sides, ceiling vent (metal grate),
	// and Crawford's office at the far end.
	{
		id: 'door-reception-side-A',
		kind: 'door',
		origin: new Vector3(-4, 0, 4),
		yaw: Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_010.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-reception-A',
	},
	{
		id: 'door-reception-side-B',
		kind: 'door',
		origin: new Vector3(4, 0, 4),
		yaw: -Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_011.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-reception-B',
	},
	{
		id: 'door-lounge-side-1',
		kind: 'door',
		origin: new Vector3(-6, 0, 12),
		yaw: Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_018.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-lounge-1',
	},
	{
		id: 'door-lounge-side-2',
		kind: 'door',
		origin: new Vector3(6, 0, 12),
		yaw: -Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_022.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-lounge-2',
	},
	{
		id: 'door-vent-ceiling',
		kind: 'door',
		origin: new Vector3(0, 3, 12),
		yaw: 0,
		width: 0.8,
		height: 0.8,
		family: 'metal',
		texture: 'T_Door_Metal_03.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-vent-drop',
	},
	{
		id: 'door-crawford-office',
		kind: 'door',
		origin: new Vector3(0, 0, 18),
		yaw: 0,
		width: 1.2,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_Painted_028.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-crawford',
	},

	// Lights — global panic strobe + Crawford reveal spotlight.
	{
		id: 'light-panic-strobe',
		kind: 'light',
		origin: new Vector3(0, 2.8, 12),
		yaw: 0,
		light: 'point',
		color: [1.0, 0.3, 0.3],
		intensity: 0.9,
		range: 14,
	},
	{
		id: 'light-crawford-spot',
		kind: 'light',
		origin: new Vector3(0, 2.8, 26),
		yaw: 0,
		light: 'spot',
		color: [1.0, 0.95, 0.85],
		intensity: 0,
		range: 8,
		direction: new Vector3(0, -0.3, -1),
		conicalAngle: 0.7,
	},
];

const cues: Cue[] = [
	// Entry — panic-alarm wail comes up + global strobe + floor narrator.
	{
		id: 'amb-alarm',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: {
			verb: 'ambience-fade',
			layerId: 'tense-drone',
			toVolume: 0.65,
			durationMs: 1500,
		},
	},
	{
		id: 'panic-strobe',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: {
			verb: 'lighting',
			lightId: 'light-panic-strobe',
			tween: { kind: 'flicker', minIntensity: 0.3, maxIntensity: 0.9, hz: 2.5, durationMs: 75000 },
		},
	},
	{
		id: 'narr-floor',
		trigger: { kind: 'wall-clock', atMs: 300 },
		action: { verb: 'narrator', text: 'EXECUTIVE SUITES — FLOOR 47', durationMs: 1500 },
	},

	// Position 1 — reception. Two flanking doors burst, then a charge from
	// the desk side at 11s.
	{
		id: 'p1-doors-A',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'door', doorId: 'door-reception-side-A', to: 'open' },
	},
	{
		id: 'p1-doors-B',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'door', doorId: 'door-reception-side-B', to: 'open' },
	},
	{
		id: 'p1-spawn-A',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-reception-A',
			archetype: 'security-guard',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p1-spawn-B',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-reception-B',
			archetype: 'hitman',
			fireProgram: 'pistol-cover-pop',
		},
	},
	{
		id: 'p1-charge',
		trigger: { kind: 'wall-clock', atMs: 11000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-reception-charge',
			archetype: 'middle-manager',
			fireProgram: 'charge-sprint',
		},
	},

	// Position 2 — executive lounge. First pre-aggro beat (hitman visible at
	// the bar before alert), 2-door mass-pop, ceiling-vent drop at 51s.
	{
		id: 'p2-pre-aggro',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-lounge' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-pre-aggro',
			archetype: 'hitman',
			fireProgram: 'pre-aggro-pistol-pop',
		},
	},
	{
		id: 'p2-doors-1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-lounge' },
		action: { verb: 'door', doorId: 'door-lounge-side-1', to: 'open' },
	},
	{
		id: 'p2-spawn-1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-lounge' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-lounge-1',
			archetype: 'security-guard',
			fireProgram: 'pistol-cover-pop',
		},
	},
	{
		id: 'p2-doors-2',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-lounge' },
		action: { verb: 'door', doorId: 'door-lounge-side-2', to: 'open' },
	},
	{
		id: 'p2-spawn-2',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-lounge' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-lounge-2',
			archetype: 'hitman',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-vent',
		trigger: { kind: 'wall-clock', atMs: 38000 },
		action: { verb: 'door', doorId: 'door-vent-ceiling', to: 'open' },
	},
	{
		id: 'p2-vent-drop',
		trigger: { kind: 'wall-clock', atMs: 38200 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vent-drop',
			archetype: 'swat',
			fireProgram: 'vault-drop-fire',
		},
	},

	// Position 3 — Crawford. Silent entrance: ambience drops, bourbon glass
	// sets down, spotlight snaps, shotgun rack, ambience back up, boss spawns.
	{
		id: 'p3-amb-drop',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-crawford' },
		action: {
			verb: 'ambience-fade',
			layerId: 'tense-drone',
			toVolume: 0.2,
			durationMs: 800,
		},
	},
	{
		id: 'p3-spotlight',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-crawford' },
		action: {
			verb: 'lighting',
			lightId: 'light-crawford-spot',
			tween: { kind: 'snap', intensity: 1.5 },
		},
	},
	{
		id: 'p3-rack',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-crawford' },
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-boss-cleared.mp3' },
	},
	{
		id: 'p3-amb-up',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-crawford' },
		action: {
			verb: 'ambience-fade',
			layerId: 'tense-drone',
			toVolume: 0.7,
			durationMs: 800,
		},
	},
	{
		id: 'p3-door',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-crawford' },
		action: { verb: 'door', doorId: 'door-crawford-office', to: 'open' },
	},
	{
		id: 'p3-boss',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-crawford' },
		action: { verb: 'boss-spawn', bossId: 'crawford', phase: 1 },
	},
	{
		id: 'p3-phase-2',
		trigger: { kind: 'wall-clock', atMs: 60000 },
		action: { verb: 'boss-phase', bossId: 'crawford', phase: 2 },
	},
	{
		id: 'p3-ad-vent',
		trigger: { kind: 'wall-clock', atMs: 62000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-crawford-ad-vent',
			archetype: 'swat',
			fireProgram: 'vault-drop-fire',
		},
	},
	{
		id: 'p3-ad-side',
		trigger: { kind: 'wall-clock', atMs: 65000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-crawford-ad-side',
			archetype: 'security-guard',
			fireProgram: 'charge-sprint',
		},
	},

	// Transition to Boardroom (final boss).
	{
		id: 'transition',
		trigger: { kind: 'wall-clock', atMs: 75000 },
		action: { verb: 'transition', toLevelId: 'boardroom' },
	},
];

export const executiveLevel: Level = {
	id: 'executive',
	displayName: 'Executive Suites — Floor 47',
	primitives,
	spawnRails: [
		{
			id: 'rail-spawn-reception-A',
			path: [new Vector3(-5, 0, 5), new Vector3(-4, 0, 4.5), new Vector3(-3, 0, 4.5)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-reception-B',
			path: [new Vector3(5, 0, 5), new Vector3(4, 0, 4.5), new Vector3(3, 0, 4.5)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-reception-charge',
			path: [new Vector3(0, 0, 8), new Vector3(0, 0, 6), new Vector3(0, 0, 5)],
			speed: 3.0,
			loop: false,
		},
		{
			id: 'rail-spawn-lounge-1',
			path: [new Vector3(-7, 0, 12), new Vector3(-6, 0, 12), new Vector3(-4, 0, 12)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-lounge-2',
			path: [new Vector3(7, 0, 12), new Vector3(6, 0, 12), new Vector3(4, 0, 12)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-vent-drop',
			path: [new Vector3(0, 3.5, 12), new Vector3(0, 0, 12)],
			speed: 6.0,
			loop: false,
		},
		{
			id: 'rail-spawn-pre-aggro',
			path: [new Vector3(-3, 0, 14), new Vector3(-3, 0, 13), new Vector3(-2, 0, 13)],
			speed: 0.5,
			loop: false,
		},
		{
			id: 'rail-spawn-crawford',
			path: [new Vector3(0, 0, 30), new Vector3(0, 0, 26)],
			speed: 1.5,
			loop: false,
		},
		{
			id: 'rail-spawn-crawford-ad-vent',
			path: [new Vector3(0, 3.5, 25), new Vector3(0, 0, 25)],
			speed: 6.0,
			loop: false,
		},
		{
			id: 'rail-spawn-crawford-ad-side',
			path: [new Vector3(-6, 0, 22), new Vector3(-3, 0, 23)],
			speed: 2.0,
			loop: false,
		},
	],
	civilianRails: [],
	ambienceLayers: [
		{
			id: 'tense-drone',
			audio: 'ambience/ambience-tense-drone.ogg',
			volume: 0.65,
			loop: true,
		},
	],
	cameraRail,
	cues,
};
