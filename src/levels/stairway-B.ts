import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
import { floor, wall } from './builders';
import type { Level, Primitive } from './types';

/**
 * Level 04 — Stairway B. Mirrors docs/spec/levels/04-stairway-B.md.
 *
 * 50% longer than Stairway A. Two combat positions:
 *   pos-1 (24s)         lower well, propped door, double-crawler
 *   pos-2-mass-pop (32s) upper landing 4-pop + first hitman + vault-drop
 *
 * Target time on Normal: 90s. Introduces the hitman archetype and the
 * mass-pop-volley fire program.
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
			lookAt: new Vector3(-1, 3, 5.5),
			dwellMs: 24000,
		},
		{
			id: 'pos-2-mass-pop',
			kind: 'combat',
			position: new Vector3(0, 5.5, 8),
			lookAt: new Vector3(0, 6, 10),
			dwellMs: 32000,
		},
		{
			id: 'exit',
			kind: 'glide',
			position: new Vector3(0, 6, 11),
			lookAt: new Vector3(0, 6, 13),
		},
	],
};

const primitives: Primitive[] = [
	// Floors / landings.
	floor({ id: 'floor-bottom', origin: new Vector3(0, 0, 0), width: 4, depth: 4 }),
	floor({ id: 'floor-mid-landing', origin: new Vector3(0, 3, 5), width: 6, depth: 4 }),
	floor({ id: 'floor-top-landing', origin: new Vector3(0, 6, 10), width: 6, depth: 4 }),

	// Shaft walls — south wall is unadorned (chalk-arrow "AUDITOR ↑" graffiti
	// decal pending; no chalk-arrow PNG yet in retro library).
	wall({
		id: 'wall-shaft-N',
		origin: new Vector3(-3, 0, 5),
		yaw: Math.PI / 2,
		width: 14,
		height: 9,
		// Mid-shaft kit on the north wall — pacing beat between the Open
		// Plan boss clear and the HR Corridor. Visual anchor on otherwise
		// bare wall.
		healthKit: { id: 'kit-stairway-B-shaft', hp: 35, offset: [-2, 1.6] },
	}),
	wall({
		id: 'wall-shaft-S',
		origin: new Vector3(3, 0, 5),
		yaw: -Math.PI / 2,
		width: 14,
		height: 9,
	}),
	// End-cap walls so the shaft reads as enclosed. yaw picked so each
	// front face points inward toward shaft interior.
	wall({
		id: 'wall-shaft-bottom-end',
		origin: new Vector3(0, 0, -2),
		yaw: Math.PI,
		width: 6,
		height: 9,
	}),
	wall({
		id: 'wall-shaft-top-end',
		origin: new Vector3(0, 0, 12),
		yaw: 0,
		width: 6,
		height: 9,
	}),

	// Doors.
	{
		id: 'door-mid-propped',
		kind: 'door',
		origin: new Vector3(-1, 3, 5.5),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'metal',
		texture: 'T_Door_Metal_03.png',
		swing: 'inward',
		state: 'open',
		spawnRailId: 'rail-spawn-mid-propped',
	},
	{
		id: 'door-top-L',
		kind: 'door',
		origin: new Vector3(-2, 6, 11),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'metal',
		texture: 'T_Door_Metal_07.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-top-L-A',
	},
	{
		id: 'door-top-R',
		kind: 'door',
		origin: new Vector3(2, 6, 11),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'metal',
		texture: 'T_Door_Metal_08.png',
		swing: 'inward',
		state: 'closed',
		spawnRailId: 'rail-spawn-top-R-A',
	},
	{
		id: 'shutter-vending',
		kind: 'shutter',
		origin: new Vector3(3, 6, 10),
		yaw: 0,
		width: 1.5,
		height: 2.2,
		texture: 'T_Shutter_Wood_009.png',
		state: 'down',
	},
	{
		id: 'door-exit-hr',
		kind: 'door',
		origin: new Vector3(0, 6, 12),
		yaw: 0,
		width: 1,
		height: 2.2,
		family: 'metal',
		texture: 'T_Door_Metal_00.png',
		swing: 'inward',
		state: 'closed',
	},

	// Lights — top fluorescent is "smashed" (intensity 0); shaft fluorescent flickers.
	{
		id: 'light-fluo-shaft-A',
		kind: 'light',
		origin: new Vector3(0, 8.5, 3),
		yaw: 0,
		light: 'point',
		color: [1.0, 1.0, 0.95],
		intensity: 0.6,
		range: 6,
	},
	{
		id: 'light-fluo-top-smashed',
		kind: 'light',
		origin: new Vector3(0, 8.5, 10),
		yaw: 0,
		light: 'point',
		color: [1.0, 1.0, 0.95],
		intensity: 0,
		range: 4,
	},
	{
		id: 'ceiling-shaft',
		kind: 'ceiling',
		origin: new Vector3(0, 0, 5),
		yaw: 0,
		width: 6,
		depth: 14,
		pbr: 'ceiling-tile',
		height: 9,
	},
	{
		id: 'light-fill',
		kind: 'light',
		origin: new Vector3(0, 6, 5),
		yaw: 0,
		light: 'hemispheric',
		color: [0.95, 0.95, 1.0],
		intensity: 0.3,
	},

	// Stair flights connecting bottom (Y=0) → mid-landing (Y=3) → top
	// (Y=6). Without these, the camera ascends through visible void between
	// floor slabs — the defect the visual audit caught.
	{
		id: 'stair-flight-1',
		kind: 'prop',
		origin: new Vector3(0, 0, 2.5),
		yaw: 0,
		glb: 'props/staircase-2.glb',
		// Same authored scale as the staircase-1 GLB — large reference scene
		// in source. 0.05 brings it down to a usable ~3m flight per landing.
		scale: 0.05,
	},
	{
		id: 'stair-flight-2',
		kind: 'prop',
		origin: new Vector3(0, 3, 7.5),
		yaw: 0,
		glb: 'props/staircase-2.glb',
		scale: 0.05,
	},
];

const cues: Cue[] = [
	{
		id: 'amb-fade',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: {
			verb: 'ambience-fade',
			layerId: 'managers-only',
			toVolume: 0.25,
			durationMs: 1500,
		},
	},
	{
		id: 'flicker',
		trigger: { kind: 'wall-clock', atMs: 0 },
		action: {
			verb: 'lighting',
			lightId: 'light-fluo-shaft-A',
			tween: { kind: 'flicker', minIntensity: 0.4, maxIntensity: 0.7, hz: 5, durationMs: 90000 },
		},
	},

	// Position 1 — propped door already open; no door cue needed. Spec
	// authorial intent is "double-crawler" — one guard via the propped door
	// (cover-pop tempo), one manager crawling up the well from below.
	{
		id: 'p1-spawn-A',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-propped',
			archetype: 'security-guard',
			fireProgram: 'pistol-cover-pop',
		},
	},
	{
		// Crawler comes up the lower well, not through the propped door —
		// distinct rail so the two enemies don't share a path.
		id: 'p1-spawn-B',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-1' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-mid-crawler',
			archetype: 'middle-manager',
			fireProgram: 'crawler-lunge',
		},
	},

	// Position 2 — mass-pop wave.
	{
		id: 'p2-door-L',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-mass-pop' },
		action: { verb: 'door', doorId: 'door-top-L', to: 'open' },
	},
	{
		id: 'p2-door-R',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-mass-pop' },
		action: { verb: 'door', doorId: 'door-top-R', to: 'open' },
	},
	{
		id: 'p2-spawn-L1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-mass-pop' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-top-L-A',
			archetype: 'security-guard',
			fireProgram: 'mass-pop-volley',
		},
	},
	{
		id: 'p2-spawn-L2',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-mass-pop' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-top-L-B',
			archetype: 'middle-manager',
			fireProgram: 'mass-pop-volley',
		},
	},
	{
		id: 'p2-spawn-R1',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-mass-pop' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-top-R-A',
			archetype: 'security-guard',
			fireProgram: 'mass-pop-volley',
		},
	},
	{
		id: 'p2-spawn-R2',
		trigger: { kind: 'on-arrive', railNodeId: 'pos-2-mass-pop' },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-top-R-B',
			archetype: 'middle-manager',
			fireProgram: 'mass-pop-volley',
		},
	},

	// Hitman reveal — wall-clock timing tuned to the actual rail timeline
	// (enter glide ≈1s + pos-1 dwell 24s + glide ≈2s = pos-2 starts ≈27s).
	// Reveal lands ~12s into pos-2 dwell = wall-clock 39s, well inside the
	// 32s dwell window that ends at ~59s. Vault at +18s, second hitman at
	// +24s. All three resolve before pos-2 dwell expires.
	{
		id: 'p2-shutter',
		trigger: { kind: 'wall-clock', atMs: 39000 },
		action: { verb: 'shutter', shutterId: 'shutter-vending', to: 'up' },
	},
	{
		id: 'p2-hitman-stinger',
		trigger: { kind: 'wall-clock', atMs: 39100 },
		// Bespoke hitman-reveal.ogg is a future asset slice; reuse the
		// shipped bright stinger so the cue plays at runtime.
		action: { verb: 'audio-stinger', audio: 'stinger/stinger-bright.mp3' },
	},
	{
		id: 'p2-hitman-spawn',
		trigger: { kind: 'wall-clock', atMs: 39200 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vending',
			archetype: 'hitman',
			fireProgram: 'pistol-cover-pop',
		},
	},
	{
		id: 'p2-vault',
		trigger: { kind: 'wall-clock', atMs: 45000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vault-service-door',
			archetype: 'security-guard',
			fireProgram: 'vault-drop-fire',
		},
	},
	{
		id: 'p2-hitman-B',
		trigger: { kind: 'wall-clock', atMs: 51000 },
		action: {
			verb: 'enemy-spawn',
			railId: 'rail-spawn-vending',
			archetype: 'hitman',
			fireProgram: 'justice-glint',
		},
	},

	{
		// On-clear of the mass-pop wave at the top landing. Wall-clock
		// atMs:90000 pre-dated PR#66 and assumed instant-resume dwell.
		id: 'transition',
		trigger: { kind: 'on-clear', railNodeId: 'pos-2-mass-pop' },
		action: { verb: 'transition', toLevelId: 'hr-corridor' },
	},
];

export const stairwayBLevel: Level = {
	id: 'stairway-B',
	displayName: 'Stairway B — Floors 7→8',
	primitives,
	spawnRails: [
		{
			id: 'rail-spawn-mid-propped',
			path: [new Vector3(-2, 3, 6), new Vector3(-1, 3, 5.5), new Vector3(0, 3, 5)],
			speed: 2.5,
			loop: false,
		},
		// Crawler-from-below rail used by p1-spawn-B; comes up the lower
		// well alongside (not through) the propped door.
		{
			id: 'rail-spawn-mid-crawler',
			path: [
				new Vector3(0, -1, 1),
				new Vector3(0, 0, 1),
				new Vector3(0, 1.5, 3),
				new Vector3(0, 2.5, 4),
			],
			speed: 1.5,
			loop: false,
		},
		// Mass-pop: four lanes, two per door, lateral offsets so the four
		// enemies don't share a path or overlap visually.
		{
			id: 'rail-spawn-top-L-A',
			path: [new Vector3(-2.4, 6, 12), new Vector3(-2.4, 6, 11), new Vector3(-1.4, 6, 10)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-top-L-B',
			path: [new Vector3(-1.6, 6, 12), new Vector3(-1.6, 6, 11), new Vector3(-0.6, 6, 10)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-top-R-A',
			path: [new Vector3(2.4, 6, 12), new Vector3(2.4, 6, 11), new Vector3(1.4, 6, 10)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-top-R-B',
			path: [new Vector3(1.6, 6, 12), new Vector3(1.6, 6, 11), new Vector3(0.6, 6, 10)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-vending',
			path: [new Vector3(3.5, 6, 11), new Vector3(3, 6, 10), new Vector3(2, 6, 10)],
			speed: 2.0,
			loop: false,
		},
		{
			id: 'rail-spawn-vault-service-door',
			path: [new Vector3(3, 8, 9), new Vector3(3, 6, 9), new Vector3(2, 6, 9)],
			speed: 4.5,
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
