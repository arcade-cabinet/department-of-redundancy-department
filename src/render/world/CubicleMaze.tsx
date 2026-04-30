import { Gltf, useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import { RepeatWrapping, SRGBColorSpace } from 'three';
import type { Manifest } from '@/content/manifest';
import { Character } from '@/render/characters/Character';
import { CeilingFixture } from '@/render/lighting/CeilingFixture';
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

	// Convert maze grid to world coordinates: maze (0,0) → world center-of-grid.
	const worldX = (gx: number) => (gx - (maze.width - 1) / 2) * cellSize;
	const worldZ = (gy: number) => (gy - (maze.height - 1) / 2) * cellSize;

	const halfCell = cellSize / 2;
	const wallY = wallHeight / 2;

	const walls: { key: string; pos: [number, number, number]; size: [number, number, number] }[] =
		[];
	const desks: [number, number, number][] = [];
	const lights: [number, number, number][] = [];

	for (let y = 0; y < maze.height; y++) {
		for (let x = 0; x < maze.width; x++) {
			const cell = maze.cubicles[y]?.[x];
			if (!cell) continue;
			const cx = worldX(x);
			const cz = worldZ(y);

			// Dedupe wall ownership: each cubicle owns its NORTH and WEST walls
			// (by convention). The SOUTH wall of (x,y) == the NORTH wall of
			// (x, y+1); we only emit it from the northern owner. Same for
			// EAST/WEST. Perimeter cubicles emit their outer side too.
			emitWallIf(walls, cell, 'north', cx, wallY, cz - halfCell, cellSize, wallHeight, true);
			emitWallIf(walls, cell, 'west', cx - halfCell, wallY, cz, cellSize, wallHeight, false);
			if (y === maze.height - 1)
				emitWallIf(walls, cell, 'south', cx, wallY, cz + halfCell, cellSize, wallHeight, true);
			if (x === maze.width - 1)
				emitWallIf(walls, cell, 'east', cx + halfCell, wallY, cz, cellSize, wallHeight, false);

			desks.push([cx, 0, cz - 0.6]);
			// One ceiling fixture per cubicle, mounted just below the ceiling
			// so RectAreaLight + back-side facing down lights the cell.
			lights.push([cx, ceilingHeight - 0.02, cz]);
		}
	}

	const center = maze.center;

	return (
		<group>
			{walls.map(({ key, pos, size }) => (
				<mesh key={key} position={pos} castShadow receiveShadow>
					<boxGeometry args={size} />
					<meshStandardMaterial {...tex} />
				</mesh>
			))}

			{/* One desk per cubicle */}
			{desks.map(([dx, dy, dz]) => (
				<Gltf
					key={`desk-${dx.toFixed(2)}-${dz.toFixed(2)}`}
					src="/assets/models/props/desk.glb"
					position={[dx, dy, dz]}
					castShadow
					receiveShadow
				/>
			))}

			{/* Manager at the center cubicle */}
			<Character
				slug="middle-manager"
				manifest={manifest}
				position={[worldX(center.x), 0, worldZ(center.y) + 0.2]}
				rotationY={Math.PI}
			/>

			{/* Ceiling fixtures */}
			{lights.map(([lx, ly, lz]) => (
				<CeilingFixture
					key={`fix-${lx.toFixed(2)}-${lz.toFixed(2)}`}
					position={[lx, ly, lz]}
					width={cellSize * 0.7}
					height={cellSize * 0.4}
					intensity={4.5}
				/>
			))}
		</group>
	);
}

function emitWallIf(
	out: { key: string; pos: [number, number, number]; size: [number, number, number] }[],
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
