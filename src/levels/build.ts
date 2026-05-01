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

// One full texture tile covers this many meters of surface, per PBR set.
// Without these, a single 2K tile stretches across an entire 6×10m floor —
// the visible 2-plank-laminate defect. The texture authoring scale here
// matches the apparent feature size of each material set; e.g. one
// laminate diffuse contains ~5 planks across, so PBR_TILE_METERS=2.5 gives
// roughly 0.5m planks at runtime.
const PBR_TILE_METERS: Readonly<Record<PbrSurface, number>> = {
	laminate: 2.5,
	carpet: 2.0,
	drywall: 3.0,
	'ceiling-tile': 2.4, // ceiling-tile diffuse contains a 4×4 tile grid
	whiteboard: 4.0, // whiteboards are large flat panels — don't over-tile
};

function pbrMaterial(
	scene: Scene,
	surface: PbrSurface,
	name: string,
	uvSize?: { readonly width: number; readonly height: number },
): PBRMaterial {
	const mat = new PBRMaterial(name, scene);
	const root = `${PBR_BASE}/${surface}/${surface}`;
	const tileMeters = PBR_TILE_METERS[surface];
	// Sub-1 scale is valid for surfaces narrower than one full tile (e.g.
	// a 0.5m-wide pillar with drywall@3m gets uScale=0.17), preserving
	// realistic feature size. Clamping to 1 stretches a single tile across
	// the surface, which is exactly the bug we fixed elsewhere.
	const uScale = uvSize ? uvSize.width / tileMeters : 1;
	const vScale = uvSize ? uvSize.height / tileMeters : 1;
	const apply = (tex: Texture) => {
		tex.uScale = uScale;
		tex.vScale = vScale;
		return tex;
	};
	mat.albedoTexture = apply(new Texture(`${root}_Diffuse_2k.jpg`, scene));
	mat.bumpTexture = apply(new Texture(`${root}_nor_gl_2k.jpg`, scene));
	mat.metallicTexture = apply(new Texture(`${root}_Rough_2k.jpg`, scene));
	mat.useRoughnessFromMetallicTextureGreen = true;
	mat.useMetallnessFromMetallicTextureBlue = false;
	mat.metallic = 0;
	mat.roughness = 1;
	mat.ambientTexture = apply(new Texture(`${root}_AO_2k.jpg`, scene));
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
	const wallMat = pbrMaterial(scene, wall.pbr, `mat-wall-${wall.id}`, {
		width: wall.width,
		height: wall.height,
	});
	// Walls are single-sided planes; if a level author gets the yaw wrong
	// the whole wall vanishes. Render both sides so geometry never shows
	// through to clear-color.
	wallMat.backFaceCulling = false;
	mesh.material = wallMat;
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
		buildHealthKit(scene, wall.healthKit, mesh, handles);
	}
	return mesh;
}

const HEALTH_KIT_BOX_SIZE = 0.45;
const HEALTH_KIT_BOX_DEPTH = 0.18;

function buildHealthKit(
	scene: Scene,
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
	const mat = pbrMaterial(scene, floor.pbr, `mat-floor-${floor.id}`, {
		width: floor.width,
		height: floor.depth,
	});
	// Stairway levels have multiple floor slabs at different Y heights; the
	// camera ascends and looks UP at slabs that are above it. Default
	// backface-cull would render those upward slabs as transparent
	// (revealing clear-color void). Show both sides so the underside reads
	// as ceiling-tile-equivalent.
	mat.backFaceCulling = false;
	mesh.material = mat;
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
	const ceilMat = pbrMaterial(scene, ceiling.pbr, `mat-ceiling-${ceiling.id}`, {
		width: ceiling.width,
		height: ceiling.depth,
	});
	// Same reasoning as floors/walls — guard against authoring errors.
	ceilMat.backFaceCulling = false;
	mesh.material = ceilMat;

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
	mesh.material = pbrMaterial(scene, wb.pbr, `mat-whiteboard-${wb.id}`, {
		width: wb.width,
		height: wb.height,
	});
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
	// Pillar wraps a cylinder/box; approximate UV span as circumference × height.
	const pillarPerimeter = pillar.shape === 'round' ? Math.PI * pillar.size : pillar.size * 4;
	mesh.material = pbrMaterial(scene, pillar.pbr, `mat-pillar-${pillar.id}`, {
		width: pillarPerimeter,
		height: pillar.height,
	});
	return mesh;
}

async function buildProp(scene: Scene, prop: Prop, handles: LevelHandles): Promise<void> {
	if (prop.glb.startsWith('procedural:')) {
		buildProceduralProp(scene, prop, handles);
		return;
	}
	const result = await ImportMeshAsync(`${MODEL_BASE}${prop.glb}`, scene);
	const root = result.meshes[0];
	if (!root) return;
	root.name = `prop-${prop.id}`;
	root.position.copyFrom(prop.origin);
	root.rotation.y = prop.yaw;
	if (prop.scale != null) root.scaling.setAll(prop.scale);
	handles.props.set(prop.id, root);
}

/**
 * Procedural prop builder for cases where shipping a GLB is overkill.
 * Currently only `procedural:chandelier` — a brass-tinted ring of bulbs
 * for the boardroom Phase-2 swing beat. Origin is the pivot point so the
 * `swing` prop-anim rotates around the chain anchor (origin), not the
 * geometry centroid.
 */
function buildProceduralProp(scene: Scene, prop: Prop, handles: LevelHandles): void {
	const kind = prop.glb.slice('procedural:'.length);
	if (kind !== 'chandelier') {
		console.warn(`[build] unknown procedural prop kind '${kind}' for prop '${prop.id}'`);
		return;
	}
	const root = MeshBuilder.CreateBox(`prop-${prop.id}-pivot`, { size: 0.001 }, scene);
	root.isVisible = false;
	root.position.copyFrom(prop.origin);
	root.rotation.y = prop.yaw;

	const chain = MeshBuilder.CreateCylinder(
		`prop-${prop.id}-chain`,
		{ height: 1.2, diameter: 0.06 },
		scene,
	);
	chain.parent = root;
	chain.position.y = -0.6;
	const chainMat = new StandardMaterial(`mat-${prop.id}-chain`, scene);
	chainMat.diffuseColor = new Color3(0.3, 0.3, 0.3);
	chain.material = chainMat;

	const ring = MeshBuilder.CreateTorus(
		`prop-${prop.id}-ring`,
		{ diameter: 1.2, thickness: 0.08, tessellation: 24 },
		scene,
	);
	ring.parent = root;
	ring.position.y = -1.2;
	const brassMat = new StandardMaterial(`mat-${prop.id}-brass`, scene);
	brassMat.diffuseColor = new Color3(0.9, 0.7, 0.3);
	brassMat.emissiveColor = new Color3(0.2, 0.15, 0.05);
	ring.material = brassMat;

	const bulbMat = new StandardMaterial(`mat-${prop.id}-bulb`, scene);
	bulbMat.diffuseColor = new Color3(1, 0.95, 0.85);
	bulbMat.emissiveColor = new Color3(0.9, 0.85, 0.7);
	for (let i = 0; i < 6; i++) {
		const angle = (i / 6) * Math.PI * 2;
		const bulb = MeshBuilder.CreateSphere(
			`prop-${prop.id}-bulb-${i}`,
			{ diameter: 0.18, segments: 8 },
			scene,
		);
		bulb.parent = root;
		bulb.position.set(Math.cos(angle) * 0.6, -1.2, Math.sin(angle) * 0.6);
		bulb.material = bulbMat;
	}

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
