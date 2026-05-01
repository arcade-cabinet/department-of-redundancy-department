import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import type { Light as BabylonLight } from '@babylonjs/core/Lights/light';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';

import type {
	Ceiling,
	Door,
	Floor,
	Level,
	Light,
	PbrSurface,
	Pillar,
	Primitive,
	Prop,
	Shutter,
	Wall,
	Whiteboard,
	Window as WindowPrim,
} from './types';

/**
 * Walks a Level's `primitives[]` and instantiates Babylon meshes / materials /
 * textures / lights from the schemas in docs/spec/04-construction-primitives.md.
 *
 * Returns a handles struct so cue actions (door open, light tween, prop anim)
 * can mutate built scene objects by id at runtime.
 */
export interface LevelHandles {
	readonly doors: Map<string, AbstractMesh>;
	readonly lights: Map<string, BabylonLight>;
	readonly props: Map<string, AbstractMesh>;
	readonly shutters: Map<string, AbstractMesh>;
	readonly whiteboards: Map<string, AbstractMesh>;
	readonly healthKits: Map<string, AbstractMesh>;
}

const PBR_BASE = '/assets/textures';
const RETRO_BASE = '/assets/textures/retro';
const MODEL_BASE = '/assets/models/';

function pbrMaterial(scene: Scene, surface: PbrSurface, name: string): PBRMaterial {
	const mat = new PBRMaterial(name, scene);
	const root = `${PBR_BASE}/${surface}/${surface}`;
	mat.albedoTexture = new Texture(`${root}_Diffuse_2k.jpg`, scene);
	mat.bumpTexture = new Texture(`${root}_nor_gl_2k.jpg`, scene);
	mat.metallicTexture = new Texture(`${root}_Rough_2k.jpg`, scene);
	mat.useRoughnessFromMetallicTextureGreen = true;
	mat.useMetallnessFromMetallicTextureBlue = false;
	mat.metallic = 0;
	mat.roughness = 1;
	mat.ambientTexture = new Texture(`${root}_AO_2k.jpg`, scene);
	return mat;
}

function retroOverlayMaterial(
	scene: Scene,
	family: 'doors' | 'windows' | 'shutters',
	textureFile: string,
	name: string,
): StandardMaterial {
	const mat = new StandardMaterial(name, scene);
	const tex = new Texture(`${RETRO_BASE}/${family}/${textureFile}`, scene);
	tex.hasAlpha = true;
	mat.diffuseTexture = tex;
	mat.specularColor = new Color3(0, 0, 0);
	mat.useAlphaFromDiffuseTexture = true;
	mat.backFaceCulling = false;
	return mat;
}

function buildWall(scene: Scene, wall: Wall, handles: LevelHandles): Mesh {
	const mesh = MeshBuilder.CreatePlane(
		`wall-${wall.id}`,
		{ width: wall.width, height: wall.height },
		scene,
	);
	mesh.position.copyFrom(wall.origin);
	mesh.position.y += wall.height / 2; // origin is base; plane centers
	mesh.rotation.y = wall.yaw;
	mesh.material = pbrMaterial(scene, wall.pbr, `mat-wall-${wall.id}`);
	if (wall.overlay) {
		// Overlay rendered as a thin parented plane in front of the wall.
		const overlay = MeshBuilder.CreatePlane(
			`wall-overlay-${wall.id}`,
			{ width: wall.width, height: wall.height },
			scene,
		);
		overlay.parent = mesh;
		overlay.position.z = -0.01; // bias toward camera (plane normal is -Z)
		overlay.material = retroOverlayMaterial(
			scene,
			'windows',
			wall.overlay.texture,
			`mat-wall-overlay-${wall.id}`,
		);
	}
	if (wall.healthKit) {
		buildHealthKit(scene, wall, wall.healthKit, mesh, handles);
	}
	return mesh;
}

const HEALTH_KIT_BOX_SIZE = 0.45;
const HEALTH_KIT_BOX_DEPTH = 0.18;

function buildHealthKit(
	scene: Scene,
	_wall: Wall,
	kit: import('./types').HealthKitMount,
	wallMesh: Mesh,
	handles: LevelHandles,
): void {
	const box = MeshBuilder.CreateBox(
		`health-kit-${kit.id}`,
		{ width: HEALTH_KIT_BOX_SIZE, height: HEALTH_KIT_BOX_SIZE, depth: HEALTH_KIT_BOX_DEPTH },
		scene,
	);
	const mat = new StandardMaterial(`mat-health-kit-${kit.id}`, scene);
	mat.diffuseColor = new Color3(1, 1, 1);
	mat.emissiveColor = new Color3(0.9, 0.05, 0.05);
	mat.specularColor = new Color3(0, 0, 0);
	box.material = mat;
	box.parent = wallMesh;
	const [hOff = 0, vOff = 0] = kit.offset ?? [0, 0];
	// Wall plane is in local XY (X = width, Y = height).
	box.position.x = hOff;
	box.position.y = vOff;
	// Bias slightly off the wall in the wall's local -Z (the plane normal).
	box.position.z = -HEALTH_KIT_BOX_DEPTH / 2 - 0.005;
	box.metadata = { healthKitId: kit.id, healthKitHp: kit.hp };
	handles.healthKits.set(kit.id, box);
}

function buildFloor(scene: Scene, floor: Floor): Mesh {
	const mesh = MeshBuilder.CreateGround(
		`floor-${floor.id}`,
		{ width: floor.width, height: floor.depth },
		scene,
	);
	mesh.position.copyFrom(floor.origin);
	mesh.rotation.y = floor.yaw;
	mesh.material = pbrMaterial(scene, floor.pbr, `mat-floor-${floor.id}`);
	return mesh;
}

function buildCeiling(scene: Scene, ceiling: Ceiling): Mesh {
	const mesh = MeshBuilder.CreateGround(
		`ceiling-${ceiling.id}`,
		{ width: ceiling.width, height: ceiling.depth },
		scene,
	);
	mesh.position.copyFrom(ceiling.origin);
	mesh.position.y = ceiling.height;
	mesh.rotation.x = Math.PI; // flip ground to face down
	mesh.rotation.y = ceiling.yaw;
	mesh.material = pbrMaterial(scene, ceiling.pbr, `mat-ceiling-${ceiling.id}`);

	// Emissive cutouts: small downward-facing planes with emissive material.
	if (ceiling.emissiveCutouts) {
		for (const [i, cutout] of ceiling.emissiveCutouts.entries()) {
			const fixture = MeshBuilder.CreateGround(
				`ceiling-light-${ceiling.id}-${i}`,
				{ width: cutout.width, height: cutout.depth },
				scene,
			);
			fixture.position.set(
				ceiling.origin.x + cutout.offset[0],
				ceiling.height - 0.05,
				ceiling.origin.z + cutout.offset[1],
			);
			fixture.rotation.x = Math.PI;
			const lightMat = new StandardMaterial(`mat-${fixture.name}`, scene);
			lightMat.emissiveColor = new Color3(...cutout.color).scale(cutout.intensity);
			lightMat.disableLighting = true;
			fixture.material = lightMat;
		}
	}
	return mesh;
}

function buildDoor(scene: Scene, door: Door, handles: LevelHandles): Mesh {
	const mesh = MeshBuilder.CreatePlane(
		`door-${door.id}`,
		{ width: door.width, height: door.height },
		scene,
	);
	mesh.position.copyFrom(door.origin);
	mesh.position.y += door.height / 2;
	mesh.rotation.y = door.yaw;
	mesh.material = retroOverlayMaterial(scene, 'doors', door.texture, `mat-door-${door.id}`);
	if (door.state === 'open') {
		applyDoorOpen(mesh, door);
	}
	handles.doors.set(door.id, mesh);
	return mesh;
}

export function applyDoorOpen(mesh: AbstractMesh, door: Door): void {
	switch (door.swing) {
		case 'inward':
		case 'outward': {
			const sign = door.swing === 'outward' ? 1 : -1;
			const hingeSign = door.hingedOn === 'right' ? -1 : 1;
			mesh.rotation.y = door.yaw + sign * hingeSign * (Math.PI / 2);
			break;
		}
		case 'slide-left':
			mesh.position.x -= door.width;
			break;
		case 'slide-right':
			mesh.position.x += door.width;
			break;
		case 'rolling':
			mesh.position.y += door.height;
			break;
	}
}

function buildWindow(scene: Scene, win: WindowPrim): Mesh {
	const mesh = MeshBuilder.CreatePlane(
		`window-${win.id}`,
		{ width: win.width, height: win.height },
		scene,
	);
	mesh.position.copyFrom(win.origin);
	mesh.position.y += win.height / 2;
	mesh.rotation.y = win.yaw;
	const mat = retroOverlayMaterial(scene, 'windows', win.texture, `mat-window-${win.id}`);
	if (win.emissive) {
		mat.emissiveColor = new Color3(...win.emissive);
	}
	mat.alpha = win.transparent ? 0.6 : 1.0;
	mesh.material = mat;
	return mesh;
}

function buildShutter(scene: Scene, shutter: Shutter, handles: LevelHandles): Mesh {
	const mesh = MeshBuilder.CreatePlane(
		`shutter-${shutter.id}`,
		{ width: shutter.width, height: shutter.height },
		scene,
	);
	mesh.position.copyFrom(shutter.origin);
	mesh.position.y += shutter.height / 2;
	mesh.rotation.y = shutter.yaw;
	mesh.material = retroOverlayMaterial(
		scene,
		'shutters',
		shutter.texture,
		`mat-shutter-${shutter.id}`,
	);
	applyShutterState(mesh, shutter, shutter.state);
	handles.shutters.set(shutter.id, mesh);
	return mesh;
}

export function applyShutterState(
	mesh: AbstractMesh,
	shutter: Shutter,
	to: 'down' | 'up' | 'half',
): void {
	const baseY = shutter.origin.y + shutter.height / 2;
	const lift = to === 'up' ? shutter.height : to === 'half' ? shutter.height / 2 : 0;
	mesh.position.y = baseY + lift;
}

function buildWhiteboard(scene: Scene, wb: Whiteboard, handles: LevelHandles): Mesh {
	const mesh = MeshBuilder.CreatePlane(
		`whiteboard-${wb.id}`,
		{ width: wb.width, height: wb.height },
		scene,
	);
	mesh.position.copyFrom(wb.origin);
	mesh.position.y += wb.height / 2;
	mesh.rotation.y = wb.yaw;
	mesh.material = pbrMaterial(scene, wb.pbr, `mat-whiteboard-${wb.id}`);
	handles.whiteboards.set(wb.id, mesh);
	return mesh;
}

function buildPillar(scene: Scene, pillar: Pillar): Mesh {
	const mesh =
		pillar.shape === 'round'
			? MeshBuilder.CreateCylinder(
					`pillar-${pillar.id}`,
					{ diameter: pillar.size, height: pillar.height, tessellation: 16 },
					scene,
				)
			: MeshBuilder.CreateBox(
					`pillar-${pillar.id}`,
					{ width: pillar.size, height: pillar.height, depth: pillar.size },
					scene,
				);
	mesh.position.copyFrom(pillar.origin);
	mesh.position.y += pillar.height / 2;
	mesh.rotation.y = pillar.yaw;
	mesh.material = pbrMaterial(scene, pillar.pbr, `mat-pillar-${pillar.id}`);
	return mesh;
}

async function buildProp(scene: Scene, prop: Prop, handles: LevelHandles): Promise<void> {
	const result = await ImportMeshAsync(`${MODEL_BASE}${prop.glb}`, scene);
	const root = result.meshes[0];
	if (!root) return;
	root.name = `prop-${prop.id}`;
	root.position.copyFrom(prop.origin);
	root.rotation.y = prop.yaw;
	if (prop.scale != null) root.scaling.setAll(prop.scale);
	handles.props.set(prop.id, root);
}

function buildLight(scene: Scene, light: Light, handles: LevelHandles): BabylonLight {
	const color = new Color3(...light.color);
	let bl: BabylonLight;
	switch (light.light) {
		case 'point': {
			const p = new PointLight(`light-${light.id}`, light.origin, scene);
			if (light.range != null) p.range = light.range;
			bl = p;
			break;
		}
		case 'spot': {
			const dir = light.direction ?? new Vector3(0, -1, 0);
			const angle = light.conicalAngle ?? 1.0;
			const range = light.range ?? 30;
			const s = new SpotLight(`light-${light.id}`, light.origin, dir, angle, 2, scene);
			s.range = range;
			bl = s;
			break;
		}
		case 'directional': {
			const dir = light.direction ?? new Vector3(0, -1, 0);
			bl = new DirectionalLight(`light-${light.id}`, dir, scene);
			break;
		}
		case 'hemispheric': {
			const dir = light.direction ?? new Vector3(0, 1, 0);
			bl = new HemisphericLight(`light-${light.id}`, dir, scene);
			break;
		}
	}
	bl.diffuse = color;
	bl.intensity = light.intensity;
	handles.lights.set(light.id, bl);
	return bl;
}

/**
 * Build all primitives in `level.primitives` into `scene`. Returns handles for
 * runtime mutation by cues. Prop loading is async (GLB fetch); the function
 * returns a Promise that resolves when every primitive has been instantiated.
 *
 * Disposal: caller calls `scene.dispose()` which cascades through every mesh
 * / material / texture / light created here.
 */
export async function buildLevel(scene: Scene, level: Level): Promise<LevelHandles> {
	const handles: LevelHandles = {
		doors: new Map(),
		lights: new Map(),
		props: new Map(),
		shutters: new Map(),
		whiteboards: new Map(),
		healthKits: new Map(),
	};
	const propPromises: Promise<void>[] = [];
	for (const p of level.primitives) {
		dispatchPrimitive(scene, p, handles, propPromises);
	}
	await Promise.all(propPromises);
	return handles;
}

function dispatchPrimitive(
	scene: Scene,
	p: Primitive,
	handles: LevelHandles,
	propPromises: Promise<void>[],
): void {
	switch (p.kind) {
		case 'wall':
			buildWall(scene, p, handles);
			break;
		case 'floor':
			buildFloor(scene, p);
			break;
		case 'ceiling':
			buildCeiling(scene, p);
			break;
		case 'door':
			buildDoor(scene, p, handles);
			break;
		case 'window':
			buildWindow(scene, p);
			break;
		case 'shutter':
			buildShutter(scene, p, handles);
			break;
		case 'whiteboard':
			buildWhiteboard(scene, p, handles);
			break;
		case 'pillar':
			buildPillar(scene, p);
			break;
		case 'prop':
			propPromises.push(buildProp(scene, p, handles));
			break;
		case 'light':
			buildLight(scene, p, handles);
			break;
	}
}
