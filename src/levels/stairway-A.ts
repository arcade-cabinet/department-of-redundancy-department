import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
import type { Level, Primitive } from './types';

/**
 * Level 02 — Stairway A. Mirrors docs/spec/levels/02-stairway-A.md.
 *
 * Vertical level. Rail enters at the lobby elevator and climbs +Y while the
 * camera tilts up 25°. Two combat positions: mid-stair (introduces the
 * crawler-from-below beat) and the landing-door wave (introduces the
 * synchronized 4-pop and the policeman archetype).
 *
 * Target time on Normal: 60s.
 */

const cameraRail: RailGraph = {
	defaultSpeedUps: 3,
	nodes: [
		{
			id: 'enter',
			kind: 'glide',
			position: new Vector3(0, 1.6, 0.5),
			lookAt: new Vector3(0, 6, 4),
		},
		{
			id: 'pos-mid',
			kind: 'combat',
			position: new Vector3(0, 2.5, 3),
			lookAt: new Vector3(0, 6, 4),
			dwellMs: 22000,
		},
		{
			id: 'pos-landing-wave',
			kind: 'combat',
			position: new Vector3(0, 5.5, 7),
			lookAt: new Vector3(0, 6, 9),
			dwellMs: 18000,
		},
		{
			id: 'exit',
			kind: 'glide',
			position: new Vector3(0, 6, 10),
			lookAt: new Vector3(0, 6, 12),
		},
	],
};

const primitives: Primitive[] = [
	// Floor / landings — concrete-tinted laminate stand-ins.
	{
		id: 'floor-bottom',
		kind: 'floor',
		origin: new Vector3(0, 0, 0),
		yaw: 0,
		width: 4,
		depth: 4,
		pbr: 'laminate',
	},
	{
		id: 'floor-mid-landing',
		kind: 'floor',
		origin: new Vector3(0, 3, 4),
		yaw: 0,
		width: 4,
		depth: 4,
		pbr: 'laminate',
	},
	{
		id: 'floor-top-landing',
		kind: 'floor',
		origin: new Vector3(0, 6, 8),
		yaw: 0,
		width: 4,
		depth: 4,
		pbr: 'laminate',
	},

	// Shaft walls (concrete-tinted drywall stand-ins).
	{
		id: 'wall-shaft-W',
		kind: 'wall',
		origin: new Vector3(-2, 0, 4),
		yaw: 0,
		width: 12,
		height: 9,
		pbr: 'drywall',
	},
	{
		id: 'wall-shaft-E',
		kind: 'wall',
		origin: new Vector3(2, 0, 4),
		yaw: Math.PI,
		width: 12,
		height: 9,
		pbr: 'drywall',
	},

	// Doors — metal stairwell doors.
	{
		id: 'door-mid-landing',
		kind: 'door',
		origin: new Vector3(0, 3, 5),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'metal',
		texture: 'T_Door_Metal_03.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-mid-landing',
	},
	{
		id: 'door-top-left',
		kind: 'door',
		origin: new Vector3(-1, 6, 9),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'metal',
		texture: 'T_Door_Metal_05.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-top-left',
	},
	{
		id: 'door-top-right',
		kind: 'door',
		origin: new Vector3(1, 6, 9),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'metal',
		texture: 'T_Door_Metal_06.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-top-right',
	},
	{
		id: 'door-exit-open-plan',
		kind: 'door',
		origin: new Vector3(0, 6, 11),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'metal',
		texture: 'T_Door_Metal_00.png',
		swing: 'inward',
		state: 'closed',
	},

	// Ceiling-mounted lights (flicker/snap on cue).
	{
		id: 'light-flicker-A',
		kind: 'light',
		origin: new Vector3(0, 8.5, 2),
		yaw: 0,
		light: 'point',
		color: [1.0, 1.0, 0.95],
		intensity: 0.6,
		range: 6,
	},
	{
		id: 'light-flicker-B',
		kind: 'light',
		origin: new Vector3(0, 8.5, 6),
		yaw: 0,
		light: 'point',
		color: [1.0, 1.0, 0.95],
		intensity: 0.6,
		range: 6,
	},
	{
		id: 'light-emergency-strip',
		kind: 'light',
		origin: new Vector3(0, 6, 11),
		yaw: 0,
		light: 'spot',
		color: [1.0, 0.95, 0.9],
		intensity: 0,
		range: 8,
		direction: new Vector3(0, 0, 1),
		conicalAngle: 0.9,
	},
];

const cues: Cue[] = [
	// Tilt + ambience drop on entry.
	{
		id: 'amb-fade-down',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: {
			verb: 'ambience-fade',
			layerId: 'managers-only',
			toVolume: 0.3,
			durationMs: 1500,
		},
	},
	{
		id: 'flicker-shaft',
		trigger: { kind: 'wall-clock', atMs: 200 },
		action: {
			verb: 'lighting',
			lightId: 'light-flicker-A',
			tween: { kind: 'flicker', minIntensity: 0.4, maxIntensity: 0.7, hz: 6, durationMs: 60000 },
		},
	},

	// Position 1 — mid-stair.
	{
		id: 'p1-door',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-mid' },
		action: { verb: 'door', doorId: 'door-mid-landing', to: 'open' },
	},
	{
		id: 'p1-spawn-door',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-mid' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-landing',
			archetype: 'middle-manager',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p1-spawn-crawl',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-mid' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-crawler',
			archetype: 'middle-manager',
			fireProgram: 'crawler-lunge',
		},
	},
	{
		id: 'p1-tut-below',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-mid' },
		action: { verb: 'narrator', text: 'ENEMIES CAN COME FROM BELOW', durationMs: 2500 },
	},
	{
		id: 'p1-spawn-cover',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-mid' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-landing',
			archetype: 'middle-manager',
			fireProgram: 'pistol-cover-pop',
		},
	},

	// Position 2 — landing-door wave (synchronized 4-pop, first policeman).
	{
		id: 'p2-door-L',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-landing-wave' },
		action: { verb: 'door', doorId: 'door-top-left', to: 'open' },
	},
	{
		id: 'p2-door-R',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-landing-wave' },
		action: { verb: 'door', doorId: 'door-top-right', to: 'open' },
	},
	{
		id: 'p2-spawn-L1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-landing-wave' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-top-left',
			archetype: 'middle-manager',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-spawn-L2',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-landing-wave' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-top-left',
			archetype: 'middle-manager',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-spawn-R1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-landing-wave' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-top-right',
			archetype: 'middle-manager',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-spawn-R2',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-landing-wave' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-top-right',
			archetype: 'security-guard',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-emergency-snap',
		trigger: { kind: 'on-clear', railNodeId: 'pos-landing-wave' },
		action: {
			verb: 'lighting',
			lightId: 'light-emergency-strip',
			tween: { kind: 'snap', intensity: 1.0 },
		},
	},

	// Exit.
	{
		id: 'transition',
		trigger: { kind: 'wall-clock', atMs: 60000 },
		action: { verb: 'transition', toLevelId: 'open-plan' },
	},
];

export const stairwayALevel: Level = {
	id: 'stairway-A',
	displayName: 'Stairway A — Floors 1→2',
	primitives,
	spawnRails: [
		{
			id: 'rail-spawn-mid-landing',
			path: [new Vector3(0, 3, 6), new Vector3(0, 3, 5), new Vector3(0, 3, 4.5)],
			speed: 2.0,
			loop: false,
		},
		{
			id: 'rail-spawn-mid-crawler',
			path: [
				new Vector3(0, -1, 1),
				new Vector3(0, 0, 1),
				new Vector3(0, 0.5, 2),
				new Vector3(0, 1, 3),
			],
			speed: 1.5,
			loop: false,
		},
		{
			id: 'rail-spawn-top-left',
			path: [new Vector3(-1, 6, 10), new Vector3(-1, 6, 9), new Vector3(-1, 6, 8)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-top-right',
			path: [new Vector3(1, 6, 10), new Vector3(1, 6, 9), new Vector3(1, 6, 8)],
			speed: 2.5,
			loop: false,
		},
	],
	civilianRails: [],
	ambienceLayers: [
		{ id: 'managers-only', audio: 'ambience/ambience-managers-only.ogg', volume: 0.55, loop: true },
	],
	cameraRail,
	cues,
};
