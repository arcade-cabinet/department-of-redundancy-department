import { useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace } from 'three';

const ALBEDO = '/assets/textures/carpet/carpet_Diffuse_2k.jpg';
const NORMAL = '/assets/textures/carpet/carpet_nor_gl_2k.jpg';
const ROUGH = '/assets/textures/carpet/carpet_Rough_2k.jpg';
const AO = '/assets/textures/carpet/carpet_AO_2k.jpg';

type Props = {
	/** Footprint in world units. Defaults to one chunk: 16×16. */
	size?: [number, number];
	/** How many tiles per chunk-edge — controls visual texel density. */
	repeat?: number;
};

/**
 * Office carpet floor tile. Receives shadows from the directional light;
 * does not cast (it's the ground plane).
 *
 * Uses PolyHaven `dirty_carpet` 2k Diffuse + Normal + Roughness + AO.
 * Tiled `repeat` times across the footprint so a single 16u tile shows
 * the carpet weave pattern at desk-eye distance.
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

	return (
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
			<planeGeometry args={[size[0], size[1]]} />
			<meshStandardMaterial {...tex} envMapIntensity={0.4} />
		</mesh>
	);
}
