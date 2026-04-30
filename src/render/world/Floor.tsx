import { useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace } from 'three';
import { useHdriHemispheres } from '@/render/lighting/useHdriHemispheres';

const ALBEDO = '/assets/textures/carpet/carpet_Diffuse_2k.jpg';
const NORMAL = '/assets/textures/carpet/carpet_nor_gl_2k.jpg';
const ROUGH = '/assets/textures/carpet/carpet_Rough_2k.jpg';
const AO = '/assets/textures/carpet/carpet_AO_2k.jpg';
const HDRI_PATH = '/assets/hdri/unfinished_office_2k.hdr';

type Props = {
	size?: [number, number];
	repeat?: number;
};

/**
 * Office carpet floor. Receives shadows from the directional light and
 * the cubicle wall casters; emissive map is the lower hemisphere of the
 * HDRI (see hdriProjection.ts) at low intensity, which paints the floor
 * with the warm bounce-light tint of the office without needing IBL.
 */
export function Floor({ size = [16, 16], repeat = 4 }: Props) {
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

	const { floor: hdrEmissive } = useHdriHemispheres(HDRI_PATH);

	return (
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
			<planeGeometry args={[size[0], size[1]]} />
			<meshStandardMaterial
				{...tex}
				emissiveMap={hdrEmissive}
				emissive="#FFFFFF"
				emissiveIntensity={0.12}
				envMapIntensity={0.3}
			/>
		</mesh>
	);
}
