import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
import type { Level, Primitive } from './types';

/**
 * Level 06 — Stairway C. Mirrors docs/spec/levels/06-stairway-C.md.
 *
 * Executive walnut-and-brass stairwell. Three combat positions: lower flight
 * (introduces hidden-door painting reveal), first landing (4-door mass-pop +
 * over-the-bannister vault-drop), and chandelier landing (rooftop-sniper +
 * tactical-mineable chandelier + ad rush). Pre-boss difficulty peak.
 *
 * Target time on Normal: 120s.
 */

const cameraRail: RailGraph = {
	defaultSpeedUps: 3,
	nodes: [
		{
			id: 'enter',
			kind: 'glide',
			position: new Vector3(0, 1.6, 0.5),
			lookAt: new Vector3(0, 6, 5),
		},
		{
			id: 'pos-1',
			kind: 'combat',
			position: new Vector3(0, 2.5, 4),
			lookAt: new Vector3(3, 1.5, 4),
			dwellMs: 22000,
		},
		{
			id: 'pos-2',
			kind: 'combat',
			position: new Vector3(0, 5, 8),
			lookAt: new Vector3(3, 11.5, 10),
			dwellMs: 28000,
		},
		{
			id: 'pos-3-ad-rush',
			kind: 'combat',
			position: new Vector3(0, 8, 11),
			lookAt: new Vector3(0, 6, 10),
			dwellMs: 35000,
		},
		{
			id: 'exit',
			kind: 'glide',
			position: new Vector3(0, 9, 14),
			lookAt: new Vector3(0, 9, 16),
		},
	],
};

const primitives: Primitive[] = [
	// Floors / landings — laminate (walnut-tinted stand-in).
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
		id: 'floor-mid-1',
		kind: 'floor',
		origin: new Vector3(0, 3, 5),
		yaw: 0,
		width: 6,
		depth: 4,
		pbr: 'laminate',
	},
	{
		id: 'floor-mid-2',
		kind: 'floor',
		origin: new Vector3(0, 6, 10),
		yaw: 0,
		width: 6,
		depth: 4,
		pbr: 'laminate',
	},
	{
		id: 'floor-top',
		kind: 'floor',
		origin: new Vector3(0, 9, 14),
		yaw: 0,
		width: 6,
		depth: 4,
		pbr: 'laminate',
	},

	// Atrium ceiling with chandelier emissive cutout.
	{
		id: 'ceiling-shaft',
		kind: 'ceiling',
		origin: new Vector3(0, 13, 7),
		yaw: 0,
		width: 8,
		depth: 18,
		height: 13,
		pbr: 'ceiling-tile',
		emissiveCutouts: [
			{ width: 1.2, depth: 1.2, offset: [0, 3], intensity: 1.0, color: [1.0, 0.95, 0.85] },
		],
	},

	// Side walls with walnut wainscoting (drywall stand-in).
	{
		id: 'wall-N',
		kind: 'wall',
		origin: new Vector3(-3, 0, 7),
		yaw: Math.PI / 2,
		width: 18,
		height: 13,
		pbr: 'drywall',
	},
	{
		id: 'wall-S',
		kind: 'wall',
		origin: new Vector3(3, 0, 7),
		yaw: -Math.PI / 2,
		width: 18,
		height: 13,
		pbr: 'drywall',
	},

	// Oil-painting hallway portraits (walnut-frame textures as overlays).
	{
		id: 'wall-portrait-1',
		kind: 'wall',
		origin: new Vector3(-3, 1.5, 9),
		yaw: Math.PI / 2,
		width: 2,
		height: 1.5,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_005.png' },
	},
	{
		id: 'wall-portrait-2',
		kind: 'wall',
		origin: new Vector3(3, 1.5, 9),
		yaw: -Math.PI / 2,
		width: 2,
		height: 1.5,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_006.png' },
	},
	{
		id: 'wall-portrait-3',
		kind: 'wall',
		origin: new Vector3(-3, 1.5, 11),
		yaw: Math.PI / 2,
		width: 2,
		height: 1.5,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_007.png' },
	},
	{
		id: 'wall-portrait-4',
		kind: 'wall',
		origin: new Vector3(3, 1.5, 11),
		yaw: -Math.PI / 2,
		width: 2,
		height: 1.5,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_008.png' },
	},
	{
		id: 'wall-portrait-blank',
		kind: 'wall',
		origin: new Vector3(-3, 1.5, 13),
		yaw: Math.PI / 2,
		width: 2,
		height: 1.5,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_009.png' },
	},

	// Hidden-door-painting at lower flight (signature beat — painting hinges
	// outward to reveal a hitman).
	{
		id: 'door-painting-hidden',
		kind: 'door',
		origin: new Vector3(3, 1.5, 4),
		yaw: -Math.PI / 2,
		width: 1.4,
		height: 1.6,
		family: 'wood',
		texture: 'T_Window_Wood_005.png',
		swing: 'outward',
		state: 'closed',
		spawnRailId: 'rail-spawn-painting-hidden',
	},

	// Standard wood doors at the landings.
	{
		id: 'door-mid-1-L',
		kind: 'door',
		origin: new Vector3(-2, 3, 5),
		yaw: Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_018.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-mid-1-L',
	},
	{
		id: 'door-mid-2-L',
		kind: 'door',
		origin: new Vector3(-2, 6, 10),
		yaw: Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_022.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-mid-2-L-A',
	},
	{
		id: 'door-mid-2-R',
		kind: 'door',
		origin: new Vector3(2, 6, 10),
		yaw: -Math.PI / 2,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_024.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-mid-2-R',
	},
	{
		id: 'door-mid-2-S',
		kind: 'door',
		origin: new Vector3(0, 6, 11),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_Painted_026.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-mid-2-service',
	},
	{
		id: 'door-exit-executive',
		kind: 'door',
		origin: new Vector3(0, 9, 15),
		yaw: 0,
		width: 1.2,
		height: 2.2,
		family: 'wood',
		texture: 'T_Door_Wood_Painted_028.png',
		swing: 'inward',
		state: 'closed',
	},

	// Chandelier light + emergency strip lighting.
	{
		id: 'light-chandelier',
		kind: 'light',
		origin: new Vector3(0, 12, 10),
		yaw: 0,
		light: 'point',
		color: [1.0, 0.95, 0.85],
		intensity: 0.8,
		range: 10,
	},
	{
		id: 'light-emergency-strip-A',
		kind: 'light',
		origin: new Vector3(0, 8.5, 5),
		yaw: 0,
		light: 'spot',
		color: [1.0, 0.4, 0.4],
		intensity: 0,
		range: 10,
		direction: new Vector3(0, -1, 0),
		conicalAngle: 0.9,
	},
];

const cues: Cue[] = [
	// Entry — ambience swap to clock-tick / tense-drone.
	{
		id: 'amb-clock',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: {
			verb: 'ambience-fade',
			layerId: 'tense-drone',
			toVolume: 0.5,
			durationMs: 2000,
		},
	},
	{
		id: 'narr-floor',
		trigger: { kind: 'wall-clock', atMs: 300 },
		action: { verb: 'narrator', text: 'EXECUTIVE STAIRS — UP', durationMs: 1500 },
	},

	// Position 1 — painting hidden-door + standard mid-1 door.
	{
		id: 'p1-creak',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-bright.mp3' },
	},
	{
		id: 'p1-door',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'door', doorId: 'door-painting-hidden', to: 'open' },
	},
	{
		id: 'p1-spawn',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-painting-hidden',
			archetype: 'hitman',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p1-tut-hidden',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: { verb: 'narrator', text: 'PAINTINGS HAVE TEETH', durationMs: 2500 },
	},
	{
		id: 'p1-door-mid',
		trigger: { kind: 'wall-clock', atMs: 8000 },
		action: { verb: 'door', doorId: 'door-mid-1-L', to: 'open' },
	},
	{
		id: 'p1-spawn-mid',
		trigger: { kind: 'wall-clock', atMs: 8000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-1-L',
			archetype: 'security-guard',
			fireProgram: 'pistol-cover-pop',
		},
	},
	{
		id: 'p1-vault',
		trigger: { kind: 'wall-clock', atMs: 14000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vault-drop',
			archetype: 'hitman',
			fireProgram: 'crawler-lunge',
		},
	},
	{
		id: 'p1-charge',
		trigger: { kind: 'wall-clock', atMs: 19000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-crawler-well',
			archetype: 'security-guard',
			fireProgram: 'crawler-lunge',
		},
	},

	// Position 2 — sniper + 4-door mass-pop + over-the-bannister vault-drop.
	{
		id: 'p2-sniper-spawn',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-sniper-bannister',
			archetype: 'hitman',
			fireProgram: 'sniper-aim',
		},
	},
	{
		id: 'p2-door-L',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: { verb: 'door', doorId: 'door-mid-2-L', to: 'open' },
	},
	{
		id: 'p2-door-R',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: { verb: 'door', doorId: 'door-mid-2-R', to: 'open' },
	},
	{
		id: 'p2-spawn-L-A',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-2-L-A',
			archetype: 'hitman',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-spawn-L-B',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-2-L-B',
			archetype: 'security-guard',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-spawn-R-A',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-2-R',
			archetype: 'security-guard',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-spawn-R-B',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-2-R-B',
			archetype: 'middle-manager',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p2-crawler',
		trigger: { kind: 'wall-clock', atMs: 36000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-crawler-well',
			archetype: 'hitman',
			fireProgram: 'crawler-lunge',
		},
	},
	{
		id: 'p2-vault-A',
		trigger: { kind: 'wall-clock', atMs: 38000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vault-drop-A',
			archetype: 'hitman',
			fireProgram: 'crawler-lunge',
		},
	},
	{
		id: 'p2-vault-B',
		trigger: { kind: 'wall-clock', atMs: 39000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vault-drop-B',
			archetype: 'hitman',
			fireProgram: 'crawler-lunge',
		},
	},

	// Position 3 — power-out + emergency snap + ad rush.
	{
		id: 'p3-power-out',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-ad-rush' },
		action: { verb: 'level-event', event: 'power-out' },
	},
	{
		id: 'p3-emergency',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-ad-rush' },
		action: {
			verb: 'lighting',
			lightId: 'light-emergency-strip-A',
			tween: { kind: 'snap', intensity: 0.8 },
		},
	},
	{
		id: 'p3-stinger',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-ad-rush' },
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-floor-cleared.mp3' },
	},
	{
		id: 'p3-rush-1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-ad-rush' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-2-R',
			archetype: 'security-guard',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p3-rush-2',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-3-ad-rush' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-2-service',
			archetype: 'middle-manager',
			fireProgram: 'pistol-cover-pop',
		},
	},
	{
		id: 'p3-rush-3',
		trigger: { kind: 'wall-clock', atMs: 95000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-2-R-B',
			archetype: 'hitman',
			fireProgram: 'pistol-pop-aim',
		},
	},
	{
		id: 'p3-sniper-redux',
		trigger: { kind: 'wall-clock', atMs: 105000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-sniper-bannister',
			archetype: 'hitman',
			fireProgram: 'sniper-aim',
		},
	},

	// Restoration + transition.
	{
		id: 'exit-restore',
		trigger: { kind: 'on-clear', railNodeId: 'pos-3-ad-rush' },
		action: { verb: 'level-event', event: 'lights-restored' },
	},
	{
		id: 'transition',
		trigger: { kind: 'wall-clock', atMs: 120000 },
		action: { verb: 'transition', toLevelId: 'executive' },
	},
];

export const stairwayCLevel: Level = {
	id: 'stairway-C',
	displayName: 'Stairway C — Executive Stairs',
	primitives,
	spawnRails: [
		{
			id: 'rail-spawn-painting-hidden',
			path: [new Vector3(4, 1.5, 4), new Vector3(3, 1.5, 4), new Vector3(2, 0, 4)],
			speed: 3.0,
			loop: false,
		},
		{
			id: 'rail-spawn-mid-1-L',
			path: [new Vector3(-3, 3, 5), new Vector3(-2, 3, 5), new Vector3(-1, 3, 5)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-sniper-bannister',
			path: [new Vector3(3, 12, 10), new Vector3(3, 11.5, 10)],
			speed: 0.5,
			loop: false,
		},
		{
			id: 'rail-spawn-crawler-well',
			path: [
				new Vector3(0, -1, 6),
				new Vector3(0, 0, 6),
				new Vector3(0, 1, 7),
				new Vector3(0, 2, 8),
			],
			speed: 1.5,
			loop: false,
		},
		{
			id: 'rail-spawn-vault-drop',
			path: [new Vector3(0, 7, 4), new Vector3(0, 5, 4.5), new Vector3(0, 3.5, 5)],
			speed: 3.5,
			loop: false,
		},
		{
			id: 'rail-spawn-vault-drop-A',
			path: [new Vector3(-1.5, 9, 9), new Vector3(-1.5, 7, 9.5), new Vector3(-1.5, 5.5, 10)],
			speed: 3.5,
			loop: false,
		},
		{
			id: 'rail-spawn-vault-drop-B',
			path: [new Vector3(1.5, 9, 9), new Vector3(1.5, 7, 9.5), new Vector3(1.5, 5.5, 10)],
			speed: 3.5,
			loop: false,
		},
		{
			id: 'rail-spawn-mid-2-L-A',
			path: [new Vector3(-3, 6, 10), new Vector3(-2, 6, 10), new Vector3(-1, 6, 10)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-mid-2-L-B',
			path: [new Vector3(-3, 6, 10.5), new Vector3(-2, 6, 10.5), new Vector3(-1, 6, 10.5)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-mid-2-R',
			path: [new Vector3(3, 6, 10), new Vector3(2, 6, 10), new Vector3(1, 6, 10)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-mid-2-R-B',
			path: [new Vector3(3, 6, 10.5), new Vector3(2, 6, 10.5), new Vector3(1, 6, 10.5)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-mid-2-service',
			path: [new Vector3(0, 6, 12), new Vector3(0, 6, 11), new Vector3(0, 6, 10.5)],
			speed: 2.5,
			loop: false,
		},
	],
	civilianRails: [],
	ambienceLayers: [
		{
			id: 'tense-drone',
			audio: 'ambience/ambience-tense-drone.ogg',
			volume: 0.5,
			loop: true,
		},
	],
	cameraRail,
	cues,
};
