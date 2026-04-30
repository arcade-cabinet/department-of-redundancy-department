import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { RailGraph } from '../rail/RailNode';

/**
 * Construction primitives — mirror docs/spec/04-construction-primitives.md verbatim.
 * Levels are bags of these. The engine reads them at level-construct and emits
 * Babylon meshes / materials / lights.
 */

export interface PrimitiveBase {
	readonly id: string;
	readonly origin: Vector3;
	readonly yaw: number;
}

export type PbrSurface = 'drywall' | 'whiteboard' | 'carpet' | 'laminate' | 'ceiling-tile';

export interface RetroOverlay {
	readonly texture: string; // filename under public/assets/textures/retro/<family>/
	readonly uvOffset?: readonly [number, number];
	readonly uvScale?: readonly [number, number];
}

export interface Wall extends PrimitiveBase {
	readonly kind: 'wall';
	readonly width: number;
	readonly height: number;
	readonly pbr: 'drywall' | 'whiteboard';
	readonly overlay?: RetroOverlay;
}

export interface Floor extends PrimitiveBase {
	readonly kind: 'floor';
	readonly width: number;
	readonly depth: number;
	readonly pbr: 'carpet' | 'laminate';
}

export interface CeilingCutout {
	readonly width: number;
	readonly depth: number;
	readonly offset: readonly [number, number];
	readonly intensity: number;
	readonly color: readonly [number, number, number];
}

export interface Ceiling extends PrimitiveBase {
	readonly kind: 'ceiling';
	readonly width: number;
	readonly depth: number;
	readonly pbr: 'ceiling-tile';
	readonly height: number;
	readonly emissiveCutouts?: readonly CeilingCutout[];
}

export type DoorFamily =
	| 'metal'
	| 'painted-metal'
	| 'rusty'
	| 'wood'
	| 'painted-wood'
	| 'double'
	| 'garage'
	| 'lift'
	| 'sliding';

export type DoorState = 'closed' | 'open';
export type DoorSwing = 'inward' | 'outward' | 'slide-left' | 'slide-right' | 'rolling';

export interface Door extends PrimitiveBase {
	readonly kind: 'door';
	readonly width: number;
	readonly height: number;
	readonly texture: string;
	readonly family: DoorFamily;
	readonly state: DoorState;
	readonly swing: DoorSwing;
	readonly hingedOn?: 'left' | 'right';
	readonly spawnRailId?: string;
}

export interface Window extends PrimitiveBase {
	readonly kind: 'window';
	readonly width: number;
	readonly height: number;
	readonly texture: string;
	readonly transparent: boolean;
	readonly emissive?: readonly [number, number, number];
}

export type ShutterState = 'down' | 'up' | 'half';

export interface Shutter extends PrimitiveBase {
	readonly kind: 'shutter';
	readonly width: number;
	readonly height: number;
	readonly texture: string;
	readonly state: ShutterState;
	readonly spawnRailId?: string;
}

export interface Whiteboard extends PrimitiveBase {
	readonly kind: 'whiteboard';
	readonly width: number;
	readonly height: number;
	readonly pbr: 'whiteboard';
	readonly caption?: string;
}

export interface Pillar extends PrimitiveBase {
	readonly kind: 'pillar';
	readonly shape: 'square' | 'round';
	readonly size: number;
	readonly height: number;
	readonly pbr: 'drywall' | 'laminate';
}

export interface Prop extends PrimitiveBase {
	readonly kind: 'prop';
	readonly glb: string;
	readonly scale?: number;
}

export type LightKind = 'point' | 'spot' | 'directional' | 'hemispheric';

export interface Light extends PrimitiveBase {
	readonly kind: 'light';
	readonly light: LightKind;
	readonly color: readonly [number, number, number];
	readonly intensity: number;
	readonly range?: number;
	readonly direction?: Vector3;
	readonly conicalAngle?: number;
}

export type Primitive =
	| Wall
	| Floor
	| Ceiling
	| Door
	| Window
	| Shutter
	| Whiteboard
	| Pillar
	| Prop
	| Light;

export interface SpawnRail {
	readonly id: string;
	readonly path: readonly Vector3[];
	readonly speed: number;
	readonly loop: boolean;
}

export type CivilianArchetype = 'intern' | 'consultant' | 'executive';

export interface CivilianRail {
	readonly id: string;
	readonly path: readonly Vector3[];
	readonly speed: number;
	readonly archetype: CivilianArchetype;
}

export interface AmbienceLayer {
	readonly id: string;
	readonly audio: string;
	readonly volume: number;
	readonly loop: boolean;
}

/**
 * Level definition. The director reads this at level-construct and runs the
 * cue list through the screenplay loop.
 */
export interface Level {
	readonly id: LevelId;
	readonly displayName: string;
	readonly primitives: readonly Primitive[];
	readonly spawnRails: readonly SpawnRail[];
	readonly civilianRails: readonly CivilianRail[];
	readonly ambienceLayers: readonly AmbienceLayer[];
	readonly cameraRail: RailGraph;
	readonly cues: readonly import('../encounter/cues').Cue[];
}

export type LevelId =
	| 'lobby'
	| 'stairway-A'
	| 'open-plan'
	| 'stairway-B'
	| 'hr-corridor'
	| 'stairway-C'
	| 'executive'
	| 'boardroom'
	| 'victory';
