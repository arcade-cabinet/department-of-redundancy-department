import { useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace } from 'three';

const LAMINATE_ALBEDO = '/assets/textures/laminate/laminate_Diffuse_2k.jpg';
const LAMINATE_NORMAL = '/assets/textures/laminate/laminate_nor_gl_2k.jpg';
const LAMINATE_ROUGH = '/assets/textures/laminate/laminate_Rough_2k.jpg';
const LAMINATE_AO = '/assets/textures/laminate/laminate_AO_2k.jpg';

type Props = {
	/** Center of the bank in world coords. */
	position?: [number, number, number];
	/** Inner cubicle dimensions in world units. */
	width?: number;
	depth?: number;
	/** Partition height. Spec §6: 1.2u (chest-high office partition). */
	wallHeight?: number;
	/** Wall thickness — kept thin so corners don't intersect. */
	thickness?: number;
};

/**
 * Four laminate cubicle walls forming an open-front office cube. The
 * front (camera-facing) edge is left open so the player can walk in.
 *
 * Wall material is laminate-textured `MeshStandardMaterial`. Walls cast
 * AND receive shadow.
 */
export function CubicleBank({
	position = [0, 0, 0],
	width = 2.4,
	depth = 2.4,
	wallHeight = 1.2,
	thickness = 0.05,
}: Props) {
	const tex = useTexture({
		map: LAMINATE_ALBEDO,
		normalMap: LAMINATE_NORMAL,
		roughnessMap: LAMINATE_ROUGH,
		aoMap: LAMINATE_AO,
	});
	for (const t of Object.values(tex)) {
		t.wrapS = t.wrapT = RepeatWrapping;
		t.repeat.set(2, 1);
	}
	tex.map.colorSpace = SRGBColorSpace;

	const halfW = width / 2;
	const halfD = depth / 2;
	const wallY = wallHeight / 2;
	const [px, py, pz] = position;

	return (
		<group position={[px, py, pz]}>
			{/* Back wall */}
			<mesh position={[0, wallY, -halfD]} castShadow receiveShadow>
				<boxGeometry args={[width, wallHeight, thickness]} />
				<meshStandardMaterial {...tex} />
			</mesh>
			{/* Left wall */}
			<mesh position={[-halfW, wallY, 0]} castShadow receiveShadow>
				<boxGeometry args={[thickness, wallHeight, depth]} />
				<meshStandardMaterial {...tex} />
			</mesh>
			{/* Right wall */}
			<mesh position={[halfW, wallY, 0]} castShadow receiveShadow>
				<boxGeometry args={[thickness, wallHeight, depth]} />
				<meshStandardMaterial {...tex} />
			</mesh>
			{/* Front wall is intentionally absent (open cubicle) */}
		</group>
	);
}
