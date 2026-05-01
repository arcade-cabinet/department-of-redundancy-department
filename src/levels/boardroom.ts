import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
import type { Level, Primitive } from './types';

/**
 * Level 08 — The Boardroom. Mirrors docs/spec/levels/08-boardroom.md.
 *
 * Single-arena final-boss fight. Rail is stationary at the boardroom doors;
 * the Reaper moves, the player does not. Three phases bound by HP thresholds:
 * REDACT (vent ads + redaction-bar HUD overlay), TELEPORT (chandelier swing,
 * scythe-slash teaching beat), and SUBPOENA (mass-pop ads from floor + ceiling
 * vents, subpoena lobs).
 *
 * Target time on Normal: 60s.
 */

const cameraRail: RailGraph = {
	defaultSpeedUps: 3,
	nodes: [
		{
			id: 'enter',
			kind: 'glide',
			position: new Vector3(0, 1.6, -4),
			lookAt: new Vector3(0, 1.6, 22),
		},
		{
			id: 'boss-arena',
			kind: 'combat',
			position: new Vector3(0, 1.6, 8),
			lookAt: new Vector3(0, 1.6, 22),
			dwellMs: 60000,
		},
		{
			id: 'victory',
			kind: 'glide',
			position: new Vector3(0, 1.6, 12),
			lookAt: new Vector3(0, 1.6, 22),
		},
	],
};

const primitives: Primitive[] = [
	// Arena floor + ceiling.
	{
		id: 'floor-boardroom',
		kind: 'floor',
		origin: new Vector3(0, 0, 12),
		yaw: 0,
		width: 24,
		depth: 24,
		pbr: 'laminate',
	},
	{
		id: 'ceiling-boardroom',
		kind: 'ceiling',
		origin: new Vector3(0, 6, 12),
		yaw: 0,
		width: 24,
		depth: 24,
		height: 6,
		pbr: 'ceiling-tile',
		emissiveCutouts: [
			// chandelier centerpiece
			{ width: 1.5, depth: 1.5, offset: [0, 0], intensity: 0.6, color: [1.0, 0.95, 0.85] },
			// 4 vent cutouts (intensity 0 — static; the vent doors open via
			// `door` cue, not via a cutout-animation pipeline).
			{ width: 0.6, depth: 0.6, offset: [-3, -4], intensity: 0, color: [1.0, 1.0, 1.0] },
			{ width: 0.6, depth: 0.6, offset: [3, -4], intensity: 0, color: [1.0, 1.0, 1.0] },
			{ width: 0.6, depth: 0.6, offset: [-3, 4], intensity: 0, color: [1.0, 1.0, 1.0] },
			{ width: 0.6, depth: 0.6, offset: [3, 4], intensity: 0, color: [1.0, 1.0, 1.0] },
		],
	},

	// Side walls — clerestory window band overlays.
	{
		id: 'wall-N',
		kind: 'wall',
		origin: new Vector3(-12, 0, 12),
		yaw: Math.PI / 2,
		width: 24,
		height: 6,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_Painted_028.png' },
	},
	{
		id: 'wall-S',
		kind: 'wall',
		origin: new Vector3(12, 0, 12),
		yaw: -Math.PI / 2,
		width: 24,
		height: 6,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_Wood_Painted_028.png' },
	},
	// Skyline backlit window at the far end.
	{
		id: 'wall-end-skyline',
		kind: 'wall',
		origin: new Vector3(0, 0, 24),
		yaw: 0,
		width: 24,
		height: 6,
		pbr: 'drywall',
		overlay: { texture: 'T_Window_GlassBricks_01.png' },
	},
	// Back wall — the 20-foot mahogany doors visible behind the player.
	{
		id: 'wall-back',
		kind: 'wall',
		origin: new Vector3(0, 0, 0),
		yaw: Math.PI,
		width: 24,
		height: 6,
		pbr: 'drywall',
		overlay: { texture: 'T_Door_Wood_Painted_028.png' },
	},

	// Boardroom whiteboards bookending the arena.
	{
		id: 'wb-q4-roadmap',
		kind: 'whiteboard',
		origin: new Vector3(-12, 1.5, 8),
		yaw: Math.PI / 2,
		width: 4,
		height: 1.5,
		pbr: 'whiteboard',
		caption: 'Q4 ROADMAP — REDACTED',
	},
	{
		id: 'wb-reorg-phase',
		kind: 'whiteboard',
		origin: new Vector3(12, 1.5, 16),
		yaw: -Math.PI / 2,
		width: 4,
		height: 1.5,
		pbr: 'whiteboard',
		caption: 'REORG: PHASE Δ',
	},

	// Doors — entry double-doors (slam-shut) + 4 vents (2 ceiling, 2 floor).
	{
		id: 'door-entry-double',
		kind: 'door',
		origin: new Vector3(0, 0, 0),
		yaw: 0,
		width: 3.5,
		height: 4,
		family: 'double',
		texture: 'T_DoubleDoor_Wood_Painted_07.png',
		swing: 'inward',
		state: 'closed',
	},
	{
		id: 'vent-ceiling-1',
		kind: 'door',
		origin: new Vector3(-3, 6, 8),
		yaw: 0,
		width: 0.8,
		height: 0.8,
		family: 'metal',
		texture: 'T_Door_Metal_03.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-vent-1',
	},
	{
		id: 'vent-ceiling-2',
		kind: 'door',
		origin: new Vector3(3, 6, 8),
		yaw: 0,
		width: 0.8,
		height: 0.8,
		family: 'metal',
		texture: 'T_Door_Metal_04.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-vent-2',
	},
	{
		id: 'vent-floor-1',
		kind: 'door',
		origin: new Vector3(-3, 0, 16),
		yaw: 0,
		width: 0.8,
		height: 0.8,
		family: 'metal',
		texture: 'T_Door_Metal_05.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-floor-1',
	},
	{
		id: 'vent-floor-2',
		kind: 'door',
		origin: new Vector3(3, 0, 16),
		yaw: 0,
		width: 0.8,
		height: 0.8,
		family: 'metal',
		texture: 'T_Door_Metal_06.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-floor-2',
	},

	// Conference table — long executive table dominating the arena. Built
	// from three desk GLBs end-to-end so it reads as a single 12m mahogany
	// slab. The Reaper hovers behind/above; the player sees the table in
	// foreground as the boss enters.
	{
		id: 'prop-conf-table-1',
		kind: 'prop',
		origin: new Vector3(0, 0, 8),
		yaw: 0,
		glb: 'props/desk.glb',
		scale: 2.5,
	},
	{
		id: 'prop-conf-table-2',
		kind: 'prop',
		origin: new Vector3(0, 0, 12),
		yaw: 0,
		glb: 'props/desk.glb',
		scale: 2.5,
	},
	{
		id: 'prop-conf-table-3',
		kind: 'prop',
		origin: new Vector3(0, 0, 16),
		yaw: 0,
		glb: 'props/desk.glb',
		scale: 2.5,
	},

	// Executive chairs flanking the table (cabinets as stand-ins per the
	// asset reuse table; the silhouette reads as upright furniture).
	{
		id: 'prop-chair-N-1',
		kind: 'prop',
		origin: new Vector3(-3, 0, 8),
		yaw: Math.PI / 2,
		glb: 'props/cabinet-3.glb',
	},
	{
		id: 'prop-chair-N-2',
		kind: 'prop',
		origin: new Vector3(-3, 0, 12),
		yaw: Math.PI / 2,
		glb: 'props/cabinet-3.glb',
	},
	{
		id: 'prop-chair-N-3',
		kind: 'prop',
		origin: new Vector3(-3, 0, 16),
		yaw: Math.PI / 2,
		glb: 'props/cabinet-3.glb',
	},
	{
		id: 'prop-chair-S-1',
		kind: 'prop',
		origin: new Vector3(3, 0, 8),
		yaw: -Math.PI / 2,
		glb: 'props/cabinet-3.glb',
	},
	{
		id: 'prop-chair-S-2',
		kind: 'prop',
		origin: new Vector3(3, 0, 12),
		yaw: -Math.PI / 2,
		glb: 'props/cabinet-3.glb',
	},
	{
		id: 'prop-chair-S-3',
		kind: 'prop',
		origin: new Vector3(3, 0, 16),
		yaw: -Math.PI / 2,
		glb: 'props/cabinet-3.glb',
	},

	// Lights — hemispheric fill, skyline-backlit point, chandelier, Reaper red spot.
	{
		// Without this, the boardroom renders pitch-black until the Reaper
		// spot fires — making the entry glide unreadable. Low-intensity hemi
		// fill so PBR walls/floor read while still feeling foreboding.
		id: 'light-fill',
		kind: 'light',
		origin: new Vector3(0, 6, 12),
		yaw: 0,
		light: 'hemispheric',
		color: [0.6, 0.65, 0.85],
		intensity: 0.45,
	},
	{
		id: 'light-skyline-backlit',
		kind: 'light',
		origin: new Vector3(0, 4, 23),
		yaw: 0,
		light: 'point',
		color: [0.3, 0.4, 0.6],
		intensity: 0.8,
		range: 16,
	},
	{
		id: 'light-chandelier',
		kind: 'light',
		origin: new Vector3(0, 5.5, 12),
		yaw: 0,
		light: 'point',
		color: [1.0, 0.95, 0.85],
		intensity: 0.6,
		range: 12,
	},
	{
		id: 'light-reaper-spot',
		kind: 'light',
		origin: new Vector3(0, 4, 22),
		yaw: 0,
		light: 'spot',
		color: [1.0, 0.3, 0.3],
		intensity: 0,
		range: 10,
		direction: new Vector3(0, -0.3, -1),
		conicalAngle: 0.6,
	},
];

const cues: Cue[] = [
	// Approach — silence ramp + door creak/open/slam + reveal shake.
	{
		id: 'amb-silence',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: {
			verb: 'ambience-fade',
			layerId: 'tense-drone',
			toVolume: 0.0,
			durationMs: 1000,
		},
	},
	{
		id: 'door-creak',
		trigger: { kind: 'wall-clock', atMs: 1000 },
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-bright.mp3' },
	},
	{
		id: 'door-open',
		trigger: { kind: 'wall-clock', atMs: 1500 },
		action: { verb: 'door', doorId: 'door-entry-double', to: 'open' },
	},
	// `to: 'closed'` door cues and `camera-shake` are deferred — both have
	// no current runtime handler in main.ts. The slam beat lands with their
	// runtime support in subsequent feature-queue work. Until then, leaving
	// silently-no-op cues here would violate the wiring rule.
	{
		id: 'door-thunder',
		trigger: { kind: 'wall-clock', atMs: 4100 },
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-100-percent.mp3' },
	},

	// Reaper reveal — spotlight + boss-spawn + theme stinger.
	{
		id: 'reaper-spot',
		trigger: { kind: 'on-arrive', railNodeId: 'boss-arena' },
		action: {
			verb: 'lighting',
			lightId: 'light-reaper-spot',
			tween: { kind: 'snap', intensity: 1.5 },
		},
	},
	{
		id: 'reaper-spawn',
		trigger: { kind: 'on-arrive', railNodeId: 'boss-arena' },
		action: { verb: 'boss-spawn', bossId: 'reaper', phase: 1 },
	},
	{
		id: 'boss-theme-1',
		trigger: { kind: 'on-arrive', railNodeId: 'boss-arena' },
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-100-percent.mp3' },
	},
	{
		id: 'reaper-narr',
		trigger: { kind: 'on-arrive', railNodeId: 'boss-arena' },
		action: { verb: 'narrator', text: 'THE REAPER', durationMs: 2500 },
	},
	// Until the boss controller is director-tracked, an immediate vent ad
	// keeps the boss-arena position in `combat` state — otherwise the
	// rail's clear-detection would fire on-arrive and skip the fight.
	{
		id: 'reaper-anchor-ad',
		trigger: { kind: 'on-arrive', railNodeId: 'boss-arena' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-reaper-entry',
			archetype: 'hitman',
			fireProgram: 'pistol-pop-aim',
		},
	},

	// Phase 1 — REDACT. Vents pop and ads drop in.
	{
		id: 'p1-vent-1-open',
		trigger: { kind: 'wall-clock', atMs: 12000 },
		action: { verb: 'door', doorId: 'vent-ceiling-1', to: 'open' },
	},
	{
		id: 'p1-vent-1-spawn',
		trigger: { kind: 'wall-clock', atMs: 12200 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vent-1',
			archetype: 'swat',
			fireProgram: 'vault-drop-fire',
		},
	},
	{
		id: 'p1-vent-2-open',
		trigger: { kind: 'wall-clock', atMs: 14000 },
		action: { verb: 'door', doorId: 'vent-ceiling-2', to: 'open' },
	},
	{
		id: 'p1-vent-2-spawn',
		trigger: { kind: 'wall-clock', atMs: 14200 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vent-2',
			archetype: 'hitman',
			fireProgram: 'vault-drop-fire',
		},
	},

	// Phase 2 — TELEPORT. Chandelier swings; another vent ad to keep pressure.
	{
		id: 'p2-phase',
		trigger: { kind: 'wall-clock', atMs: 24000 },
		action: { verb: 'boss-phase', bossId: 'reaper', phase: 2 },
	},
	// Chandelier swing prop-anim is deferred — it lands with the prop GLB
	// pipeline + prop-anim runtime handler, both subsequent feature-queue
	// items. Authoring it here without those would silently no-op.
	{
		id: 'p2-vent-spawn',
		trigger: { kind: 'wall-clock', atMs: 30000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vent-1',
			archetype: 'hitman',
			fireProgram: 'vault-drop-fire',
		},
	},

	// Phase 3 — SUBPOENA. Floor traps open + mass-pop ads from below.
	{
		id: 'p3-phase',
		trigger: { kind: 'wall-clock', atMs: 42000 },
		action: { verb: 'boss-phase', bossId: 'reaper', phase: 3 },
	},
	{
		id: 'p3-floor-1-open',
		trigger: { kind: 'wall-clock', atMs: 42500 },
		action: { verb: 'door', doorId: 'vent-floor-1', to: 'open' },
	},
	{
		id: 'p3-floor-1-spawn',
		trigger: { kind: 'wall-clock', atMs: 42700 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-floor-1',
			archetype: 'middle-manager',
			fireProgram: 'crawler-lunge',
		},
	},
	{
		id: 'p3-floor-2-open',
		trigger: { kind: 'wall-clock', atMs: 44000 },
		action: { verb: 'door', doorId: 'vent-floor-2', to: 'open' },
	},
	{
		id: 'p3-floor-2-spawn',
		trigger: { kind: 'wall-clock', atMs: 44200 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-floor-2',
			archetype: 'middle-manager',
			fireProgram: 'crawler-lunge',
		},
	},
	{
		id: 'p3-vent-redux',
		trigger: { kind: 'wall-clock', atMs: 50000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vent-2',
			archetype: 'hitman',
			fireProgram: 'lob-throw',
		},
	},

	// Victory — death dirge + ambience down + transition to victory screen.
	{
		id: 'victory-fade',
		trigger: { kind: 'on-clear', railNodeId: 'boss-arena' },
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-boss-cleared.mp3' },
	},
	{
		id: 'victory-amb',
		trigger: { kind: 'on-clear', railNodeId: 'boss-arena' },
		action: {
			verb: 'ambience-fade',
			layerId: 'tense-drone',
			toVolume: 0.0,
			durationMs: 3000,
		},
	},
	{
		id: 'transition',
		trigger: { kind: 'on-clear', railNodeId: 'boss-arena' },
		action: { verb: 'transition', toLevelId: 'victory' },
	},
];

export const boardroomLevel: Level = {
	id: 'boardroom',
	displayName: 'The Boardroom — Reaper',
	primitives,
	spawnRails: [
		{
			id: 'rail-spawn-reaper-entry',
			path: [new Vector3(0, 0, 26), new Vector3(0, 0, 22)],
			speed: 1.0,
			loop: false,
		},
		{
			id: 'rail-spawn-vent-1',
			path: [new Vector3(-3, 6.5, 8), new Vector3(-3, 0, 8)],
			speed: 6.0,
			loop: false,
		},
		{
			id: 'rail-spawn-vent-2',
			path: [new Vector3(3, 6.5, 8), new Vector3(3, 0, 8)],
			speed: 6.0,
			loop: false,
		},
		{
			id: 'rail-spawn-floor-1',
			path: [new Vector3(-3, -1, 16), new Vector3(-3, 0, 16)],
			speed: 4.0,
			loop: false,
		},
		{
			id: 'rail-spawn-floor-2',
			path: [new Vector3(3, -1, 16), new Vector3(3, 0, 16)],
			speed: 4.0,
			loop: false,
		},
	],
	civilianRails: [],
	ambienceLayers: [
		{
			id: 'tense-drone',
			audio: 'ambience/ambience-tense-drone.ogg',
			// Starts audible at 0.5 so the opening `amb-silence` fade-to-zero
			// is the audible ramp that sells the boardroom approach. A 0→0
			// fade would just be silence the whole way.
			volume: 0.5,
			loop: true,
		},
	],
	cameraRail,
	cues,
};
