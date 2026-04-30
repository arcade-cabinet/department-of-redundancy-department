import { useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace } from 'three';

const ALBEDO = '/assets/textures/ceiling-tile/ceiling-tile_Diffuse_2k.jpg';
const NORMAL = '/assets/textures/ceiling-tile/ceiling-tile_nor_gl_2k.jpg';
const ROUGH = '/assets/textures/ceiling-tile/ceiling-tile_Rough_2k.jpg';
const AO = '/assets/textures/ceiling-tile/ceiling-tile_AO_2k.jpg';

type Props = {
	size?: [number, number];
	height?: number;
	repeat?: number;
};

/**
 * Acoustic ceiling tile mesh, mirrored above the floor at the configured
 * height (default 2.6u — slightly above human eye level for a realistic
 * cubicle drop ceiling). Faces down so the player sees it from below.
 */
export function Ceiling({ size = [16, 16], height = 2.6, repeat = 4 }: Props) {
	const tex = useTexture({
		map: ALBEDO,
		normalMap: NORMAL,
		roughnessMap: ROUGH,
		aoMap: AO,
	});
	for (const t of Object.values(tex)) {
		t.wrapS = t.wrapT = RepeatWrapping;
		t.repeat.set(repeat, repeat);
	}
	tex.map.colorSpace = SRGBColorSpace;

	return (
		<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow>
			<planeGeometry args={[size[0], size[1]]} />
			<meshStandardMaterial {...tex} />
		</mesh>
	);
}
