import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
import { ceiling, floor, wall } from './builders';
import type { Level, Primitive } from './types';

/**
 * Level 07 — Executive Suites. Mirrors docs/spec/levels/07-executive-suites.md.
 *
 * Top-floor executive level. Three combat positions: outer reception (flank
 * door-burst + panic-charge), executive lounge (first pre-aggro beat — enemies visible
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
			// lookAt z=8 (forward of camera) so the FOV includes the
			// reception-A/B spawn-rail termini at z=7+; pre-fix lookAt z=5
			// pointed perpendicular to the rail axis and put the spawn
			// rails directly at the camera position.
			lookAt: new Vector3(-1.5, 1.6, 8),
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
			// Extended dwell so Phase 2 + ad drops at 60-65s land while the
			// camera is parked on Crawford. 18 (pos-1) + 22 (pos-2) + 35
			// (pos-3) ≈ 75s level budget.
			dwellMs: 35000,
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
	floor({ id: 'floor-reception', origin: new Vector3(0, 0, 4), width: 8, depth: 8 }),
	floor({ id: 'floor-lounge', origin: new Vector3(0, 0, 12), width: 12, depth: 8 }),
	// Crawford's slab origin z=24 with depth 12 spans z=18..30 — no gap to
	// the lounge floor and Crawford's spawn at z=30 stands on geometry.
	floor({ id: 'floor-crawford-office', origin: new Vector3(0, 0, 24), width: 12, depth: 12 }),

	// Executive ceiling — 12 emissive cutouts; panic-strobe overlay tint
	// driven by the lighting cue rather than per-cutout color. Center at
	// z=15 with depth 36 spans z=-3..33 and covers all three floor slabs.
	ceiling({
		id: 'ceiling-exec',
		origin: new Vector3(0, 3, 15),
		width: 12,
		depth: 36,
		height: 3,
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
	}),

	// Side walls + frosted-glass partition into the lounge + Crawford end-wall.
	wall({
		id: 'wall-N',
		origin: new Vector3(-6, 0, 14),
		yaw: Math.PI / 2,
		width: 32,
		height: 3,
		// Pre-Crawford kit. Crawford's desk-bunker phase is the last big
		// HP burn before the boss elevator to the Boardroom. Authored on
		// the long north wall mid-suite, before the lounge frosted glass.
		healthKit: { id: 'kit-executive-N', hp: 35, offset: [-6, 1.4] },
	}),
	wall({
		id: 'wall-S',
		origin: new Vector3(6, 0, 14),
		yaw: -Math.PI / 2,
		width: 32,
		height: 3,
	}),
	wall({
		id: 'wall-lounge-frosted',
		origin: new Vector3(0, 0, 18),
		yaw: 0,
		width: 12,
		height: 3,
		overlay: { texture: 'T_Window_GlassBricks_01.png' },
	}),
	wall({
		// Wall overlays load from /textures/retro/windows/, so we pick a
		// wood-grain window plate that reads as a "DIRECTOR OF OPS" plaque.
		id: 'wall-end-crawford',
		origin: new Vector3(0, 0, 30),
		yaw: 0,
		width: 12,
		height: 3,
		overlay: { texture: 'T_Window_Wood_Painted_028.png' },
	}),

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
		texture: 'T_Door_Wood_013.png',
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
		texture: 'T_Door_Wood_014.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-lounge-2',
	},
	{
		id: 'door-vent-ceiling',
		kind: 'door',
		// `buildDoor` offsets the mesh by height/2 from origin.y, so
		// origin.y = 2.2 puts the 0.8-tall vent grate at y=2.2..3.0
		// flush against the underside of the ceiling at y=3.
		origin: new Vector3(0, 2.2, 12),
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
		id: 'door-vent-crawford',
		kind: 'door',
		// Second ceiling vent over Crawford's office for the Phase 2 ad drop.
		origin: new Vector3(0, 2.2, 25),
		yaw: 0,
		width: 0.8,
		height: 0.8,
		family: 'metal',
		texture: 'T_Door_Metal_04.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-crawford-ad-vent',
	},
	{
		id: 'door-crawford-office',
		kind: 'door',
		// Pulled forward of wall-lounge-frosted (z=18) to z=21 so the door
		// reads as the entry into Crawford's office, not as a coplanar
		// overlap with the partition.
		origin: new Vector3(0, 0, 21),
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
	{
		// Suite is wood-paneled and would render near-black with only the
		// per-position spots. Warm-tinted hemi sells the executive lounge
		// without overwhelming the boss-spot reveal at pos-3.
		id: 'light-fill',
		kind: 'light',
		origin: new Vector3(0, 3, 14),
		yaw: 0,
		light: 'hemispheric',
		color: [1.0, 0.9, 0.8],
		intensity: 0.5,
	},

	// Executive-suite props per docs/spec/levels/07-executive-suites.md
	// §"Props & lights". Reception desk → leather booths → wet bar →
	// Crawford's executive desk at the boss position.
	{
		id: 'prop-reception-desk',
		kind: 'prop',
		origin: new Vector3(0, 0, 6),
		yaw: 0,
		glb: 'props/desk.glb',
	},
	{
		id: 'prop-leather-booth-L',
		kind: 'prop',
		origin: new Vector3(-3, 0, 12),
		yaw: Math.PI / 2,
		glb: 'props/cabinet-3.glb',
	},
	{
		id: 'prop-leather-booth-R',
		kind: 'prop',
		origin: new Vector3(3, 0, 12),
		yaw: -Math.PI / 2,
		glb: 'props/cabinet-3.glb',
	},
	{
		id: 'prop-wet-bar',
		kind: 'prop',
		origin: new Vector3(0, 0, 14),
		yaw: 0,
		glb: 'props/cabinet-1.glb',
	},
	{
		id: 'prop-crawford-desk',
		kind: 'prop',
		origin: new Vector3(0, 0, 26),
		yaw: 0,
		glb: 'props/desk.glb',
		scale: 1.4,
	},
	// Side credenzas flanking Crawford's office.
	{
		id: 'prop-credenza-N',
		kind: 'prop',
		origin: new Vector3(-4, 0, 24),
		yaw: Math.PI / 2,
		glb: 'props/cabinet-2.glb',
	},
	{
		id: 'prop-credenza-S',
		kind: 'prop',
		origin: new Vector3(4, 0, 24),
		yaw: -Math.PI / 2,
		glb: 'props/cabinet-2.glb',
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
	// the bar before alert), 2-door mass-pop, ceiling-vent drop at 38s.
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
		// Reveal stinger, not the cleared/victory cue. There's no shipped
		// `stinger-shotgun-rack.mp3` so we substitute the bright stinger.
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-bright.mp3' },
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
		id: 'p3-ad-vent-open',
		trigger: { kind: 'wall-clock', atMs: 61800 },
		action: { verb: 'door', doorId: 'door-vent-crawford', to: 'open' },
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
		// Transition fires once Crawford's position clears so longer fights
		// on Hard+ don't get cut off mid-combat.
		trigger: { kind: 'on-clear', railNodeId: 'pos-3-crawford' },
		action: { verb: 'transition', toLevelId: 'boardroom' },
	},
];

export const executiveLevel: Level = {
	id: 'executive',
	displayName: 'Executive Suites — Floor 47',
	primitives,
	spawnRails: [
		{
			// Reception-side spawn — pre-fix terminus at z=4.5 was behind
			// the pos-1 camera lookAt; now ends in-frustum at z=7-8 so the
			// player can engage on entry to pos-1.
			id: 'rail-spawn-reception-A',
			path: [new Vector3(-5, 0, 4.2), new Vector3(-4, 0, 6), new Vector3(-3, 0, 8)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-reception-B',
			path: [new Vector3(5, 0, 4.2), new Vector3(4, 0, 6), new Vector3(3, 0, 8)],
			speed: 2.5,
			loop: false,
		},
		{
			// Charging enemy from up-rail. Pre-fix terminus at z=5 = camera
			// position → enemy ran straight INTO the camera. Stop short at
			// z=7 so the charge reads as a charge from forward of camera.
			id: 'rail-spawn-reception-charge',
			path: [new Vector3(0, 0, 12), new Vector3(0, 0, 9), new Vector3(0, 0, 7)],
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
