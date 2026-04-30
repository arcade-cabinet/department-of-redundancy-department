import type { LevelId } from '../levels/types';
import type { ArchetypeId } from './Enemy';
import type { FirePatternId } from './FirePattern';

/**
 * Screenplay cue language — mirrors docs/spec/05-screenplay-language.md verbatim.
 * Levels are arrays of these. The director plays them like a film projector.
 */

export type CueTrigger =
	| { readonly kind: 'wall-clock'; readonly atMs: number }
	| { readonly kind: 'on-arrive'; readonly railNodeId: string }
	| { readonly kind: 'on-clear'; readonly railNodeId: string };

export type LightingTween =
	| { readonly kind: 'fade'; readonly toIntensity: number; readonly durationMs: number }
	| {
			readonly kind: 'flicker';
			readonly minIntensity: number;
			readonly maxIntensity: number;
			readonly hz: number;
			readonly durationMs: number;
	  }
	| {
			readonly kind: 'snap';
			readonly intensity: number;
			readonly color?: readonly [number, number, number];
	  }
	| {
			readonly kind: 'colour-shift';
			readonly toColor: readonly [number, number, number];
			readonly durationMs: number;
	  };

export type LevelEvent = 'fire-alarm' | 'power-out' | 'lights-restored' | 'elevator-ding';

export type BossId = 'garrison' | 'whitcomb' | 'phelps' | 'crawford' | 'reaper';

export type CueAction =
	| { readonly verb: 'camera-shake'; readonly intensity: number; readonly durationMs: number }
	| { readonly verb: 'lighting'; readonly lightId: string; readonly tween: LightingTween }
	| {
			readonly verb: 'ambience-fade';
			readonly layerId: string;
			readonly toVolume: number;
			readonly durationMs: number;
	  }
	| { readonly verb: 'audio-stinger'; readonly audio: string; readonly volume?: number }
	| { readonly verb: 'narrator'; readonly text: string; readonly durationMs: number }
	| { readonly verb: 'door'; readonly doorId: string; readonly to: 'open' | 'closed' }
	| { readonly verb: 'shutter'; readonly shutterId: string; readonly to: 'down' | 'up' | 'half' }
	| { readonly verb: 'prop-anim'; readonly propId: string; readonly animId: string }
	| {
			readonly verb: 'enemy-spawn';
			readonly railId: string;
			readonly archetype: ArchetypeId;
			readonly fireProgram: FirePatternId;
			readonly ceaseAfterMs?: number;
	  }
	| { readonly verb: 'civilian-spawn'; readonly railId: string }
	| { readonly verb: 'boss-spawn'; readonly bossId: BossId; readonly phase: number }
	| { readonly verb: 'boss-phase'; readonly bossId: BossId; readonly phase: number }
	| { readonly verb: 'level-event'; readonly event: LevelEvent }
	| { readonly verb: 'transition'; readonly toLevelId: LevelId };

export type DifficultyGate = 'easy+' | 'normal+' | 'hard+' | 'nightmare+' | 'un-only';

export interface Cue {
	readonly id: string;
	readonly trigger: CueTrigger;
	readonly action: CueAction;
	readonly difficulty?: DifficultyGate;
}
