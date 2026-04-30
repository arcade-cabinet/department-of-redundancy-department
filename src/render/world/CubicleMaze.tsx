import { Gltf, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { RepeatWrapping, SRGBColorSpace, Vector3 } from 'three';
import type { Manifest } from '@/content/manifest';
import { Character } from '@/render/characters/Character';
import { CeilingFixture } from '@/render/lighting/CeilingFixture';
import { cullByDistance, type Lamp } from '@/render/lighting/PointLightCuller';
import { type Cubicle, generateFloorMaze } from '@/world/generator/maze';

const LAMINATE_ALBEDO = '/assets/textures/laminate/laminate_Diffuse_2k.jpg';
const LAMINATE_NORMAL = '/assets/textures/laminate/laminate_nor_gl_2k.jpg';
const LAMINATE_ROUGH = '/assets/textures/laminate/laminate_Rough_2k.jpg';
const LAMINATE_AO = '/assets/textures/laminate/laminate_AO_2k.jpg';

type Props = {
	manifest: Manifest;
	seed?: string;
	/** Maze grid size in cubicles. Spec §3 / generator default. */
	gridWidth?: number;
	gridHeight?: number;
	/** Side length of one cubicle in world units (incl. partition thickness). */
	cellSize?: number;
	wallHeight?: number;
	/** Required: ceiling Y so fixtures mount just under it. */
	ceilingHeight?: number;
	/** Max active RectAreaLight ceiling fixtures. Mobile budget per spec §6. */
	maxActiveFixtures?: number;
};

const PARTITION_THICKNESS = 0.05;

/**
 * Renders the entire floor as a maze of cubicles. The maze is generated
 * deterministically by `generateFloorMaze(seed)` (Beppo-Laughs algorithm
 * port). Each cell becomes one cubicle bank (3 walls; one open side
 * configurable from the maze passages).
 *
 * Walls are shared between adjacent cubicles where the maze marks them
 * `true`; we only draw a wall on the cell whose `+x` or `+y` neighbor
 * also has it `true`, deduping to avoid Z-fighting at partitions.
 *
 * The center cubicle gets the player spawn (a middle-manager standing
 * at the desk) plus a ceiling fixture; perimeter cubicles get desks but
 * nothing animate.
 */
export function CubicleMaze({
	manifest,
	seed = 'Synergistic Bureaucratic Cubicle',
	gridWidth = 7,
	gridHeight = 7,
	cellSize = 2.6,
	wallHeight = 2.6,
	ceilingHeight = 2.6,
	maxActiveFixtures = 8,
}: Props) {
	const maze = useMemo(
		() => generateFloorMaze(gridWidth, gridHeight, seed),
		[gridWidth, gridHeight, seed],
	);

	const tex = useTexture({
		map: LAMINATE_ALBEDO,
		normalMap: LAMINATE_NORMAL,
		roughnessMap: LAMINATE_ROUGH,
		aoMap: LAMINATE_AO,
	});
	for (const t of Object.values(tex)) {
		t.wrapS = t.wrapT = RepeatWrapping;
		t.repeat.set(1, 1);
	}
	tex.map.colorSpace = SRGBColorSpace;

	const deskEntry = manifest.props.desk;
	if (!deskEntry) throw new Error('Manifest missing props/desk');

	const { walls, desks, allLamps, centerWorld } = useMemo(
		() => buildLayout(maze, cellSize, wallHeight, ceilingHeight),
		[maze, cellSize, wallHeight, ceilingHeight],
	);

	const [activeIds, setActiveIds] = useState<Set<string>>(
		() => new Set(allLamps.slice(0, maxActiveFixtures).map((l) => l.id)),
	);
	const cameraPos = useRef(new Vector3());
	const lastCullTime = useRef(0);

	// 49 RectAreaLights would be brutal on the fragment shader. Cull to the
	// `maxActiveFixtures` closest to camera every 200ms (changes only when
	// the player crosses a cubicle boundary; no per-frame churn). Mirror of
	// the DeskLamp pattern (PointLightCuller.cullByDistance).
	useFrame((state) => {
		const now = state.clock.elapsedTime;
		if (now - lastCullTime.current < 0.2) return;
		lastCullTime.current = now;
		state.camera.getWorldPosition(cameraPos.current);
		const next = cullByDistance(allLamps, cameraPos.current, maxActiveFixtures);
		if (next.size !== activeIds.size || [...next].some((id) => !activeIds.has(id))) {
			setActiveIds(next);
		}
	});

	return (
		<group>
			{walls.map(({ key, pos, size }) => (
				<mesh key={key} position={pos} castShadow receiveShadow>
					<boxGeometry args={size} />
					<meshStandardMaterial {...tex} />
				</mesh>
			))}

			{/* One desk per cubicle. Path comes from the manifest so the
			    sourceHash validation in scripts/check-asset-manifest.mjs
			    catches a desk-GLB drift before runtime. */}
			{desks.map(([dx, dy, dz]) => (
				<Gltf
					key={`desk-${dx.toFixed(2)}-${dz.toFixed(2)}`}
					src={deskEntry.path}
					position={[dx, dy, dz]}
					castShadow
					receiveShadow
				/>
			))}

			{/* Manager at the center cubicle */}
			<Character
				slug="middle-manager"
				manifest={manifest}
				position={centerWorld}
				rotationY={Math.PI}
			/>

			{/* Ceiling fixtures — only the N closest to the camera are mounted
			    to keep the active RectAreaLight count under the spec §6 budget. */}
			{allLamps
				.filter((l) => activeIds.has(l.id))
				.map((l) => (
					<CeilingFixture
						key={`fix-${l.id}`}
						position={[l.position.x, l.position.y, l.position.z]}
						width={cellSize * 0.7}
						height={cellSize * 0.4}
						intensity={4.5}
					/>
				))}
		</group>
	);
}

type WallSpec = { key: string; pos: [number, number, number]; size: [number, number, number] };

function buildLayout(
	maze: ReturnType<typeof generateFloorMaze>,
	cellSize: number,
	wallHeight: number,
	ceilingHeight: number,
): {
	walls: WallSpec[];
	desks: [number, number, number][];
	allLamps: Lamp[];
	centerWorld: [number, number, number];
} {
	const halfCell = cellSize / 2;
	const wallY = wallHeight / 2;
	const wx = (gx: number) => (gx - (maze.width - 1) / 2) * cellSize;
	const wz = (gy: number) => (gy - (maze.height - 1) / 2) * cellSize;

	const wallList: WallSpec[] = [];
	const deskList: [number, number, number][] = [];
	const lampList: Lamp[] = [];

	for (let y = 0; y < maze.height; y++) {
		for (let x = 0; x < maze.width; x++) {
			const cell = maze.cubicles[y]?.[x];
			if (!cell) continue;
			const cx = wx(x);
			const cz = wz(y);
			emitWallIf(wallList, cell, 'north', cx, wallY, cz - halfCell, cellSize, wallHeight, true);
			emitWallIf(wallList, cell, 'west', cx - halfCell, wallY, cz, cellSize, wallHeight, false);
			if (y === maze.height - 1)
				emitWallIf(wallList, cell, 'south', cx, wallY, cz + halfCell, cellSize, wallHeight, true);
			if (x === maze.width - 1)
				emitWallIf(wallList, cell, 'east', cx + halfCell, wallY, cz, cellSize, wallHeight, false);
			deskList.push([cx, 0, cz - 0.6]);
			lampList.push({ id: `${x}-${y}`, position: { x: cx, y: ceilingHeight - 0.02, z: cz } });
		}
	}
	const cc = maze.center;
	return {
		walls: wallList,
		desks: deskList,
		allLamps: lampList,
		centerWorld: [wx(cc.x), 0, wz(cc.y) + 0.2],
	};
}

function emitWallIf(
	out: WallSpec[],
	cell: Cubicle,
	side: 'north' | 'south' | 'east' | 'west',
	x: number,
	y: number,
	z: number,
	cellSize: number,
	wallHeight: number,
	horizontal: boolean,
): void {
	if (!cell.walls[side]) return;
	const size: [number, number, number] = horizontal
		? [cellSize, wallHeight, PARTITION_THICKNESS]
		: [PARTITION_THICKNESS, wallHeight, cellSize];
	out.push({ key: `${cell.x}-${cell.y}-${side}`, pos: [x, y, z], size });
}
