import { useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace } from 'three';
import { useHdriHemispheres } from '@/render/lighting/useHdriHemispheres';

const ALBEDO = '/assets/textures/ceiling-tile/ceiling-tile_Diffuse_2k.jpg';
const NORMAL = '/assets/textures/ceiling-tile/ceiling-tile_nor_gl_2k.jpg';
const ROUGH = '/assets/textures/ceiling-tile/ceiling-tile_Rough_2k.jpg';
const AO = '/assets/textures/ceiling-tile/ceiling-tile_AO_2k.jpg';
const HDRI_PATH = '/assets/hdri/unfinished_office_2k.hdr';

type Props = {
	size?: [number, number];
	height?: number;
	repeat?: number;
};

/**
 * Acoustic ceiling tile mesh. Faces down so the player sees it from below.
 *
 * The emissive map is the upper hemisphere of the HDRI projection — the
 * ceiling literally glows with the HDR's luminance gradient. emissiveIntensity
 * is the dial; the rectArea fixtures from CubicleMaze sit just below this
 * plane providing direct fill-light on top.
 *
 * Rotation `-Math.PI / 2` flips PlaneGeometry's natural +Z normal to -Y,
 * so the front face points DOWN at the player (single-side render, no
 * DoubleSide overhead).
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

	const { ceiling: hdrEmissive } = useHdriHemispheres(HDRI_PATH);

	return (
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow>
			<planeGeometry args={[size[0], size[1]]} />
			<meshStandardMaterial
				{...tex}
				emissiveMap={hdrEmissive}
				emissive="#FFFFFF"
				emissiveIntensity={0.45}
			/>
		</mesh>
	);
}
