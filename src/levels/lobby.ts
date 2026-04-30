import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Cue } from '../encounter/cues';
import type { RailGraph } from '../rail/RailNode';
import type { Level } from './types';

/**
 * Level 01 — The Lobby. Mirrors docs/spec/levels/01-lobby.md screenplay.
 *
 * NOTE: This is a doc-faithful skeleton. Construction primitives, full prop
 * geometry, light fixtures, and complete cue list are abbreviated for v1
 * boot — the canon doc has the full list. Subsequent commits flesh out the
 * remaining primitives & cues. The director, types, and cue language are
 * already complete; adding more rows to the arrays here is a content task.
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
		action: { verb: 'audio-stinger', audio: 'stingers/elevator-ding.ogg' },
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
		action: { verb: 'audio-stinger', audio: 'stingers/garrison-down.ogg' },
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

export const lobbyLevel: Level = {
	id: 'lobby',
	displayName: 'Lobby — Floor 1',
	primitives: [],
	spawnRails: [
		{
			id: 'rail-spawn-reception-A',
			path: [new Vector3(-3, 0, 5), new Vector3(-3, 0, 4), new Vector3(-2, 0, 4)],
			speed: 2.5,
			loop: false,
		},
		{
			id: 'rail-spawn-side-1',
			path: [new Vector3(3, 0, 5.5), new Vector3(3, 0, 6.5), new Vector3(2, 0, 6.5)],
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
		{ id: 'managers-only', audio: 'ambience/managers-only.ogg', volume: 0.55, loop: true },
	],
	cameraRail,
	cues,
};
