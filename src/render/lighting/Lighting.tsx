import { Environment } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';

const HDRI_PATH = '/assets/hdri/unfinished_office_2k.hdr';

/**
 * Locked render config from spec §6:
 * - HDRI Environment (PolyHaven unfinished_office)
 * - DirectionalLight from upper-Y, cool-white, casts shadows
 * - ACESFilmic tonemap, exposure 1.0, sRGB output
 * - NO fog (chunk culling gates draw distance — PRQ-03)
 *
 * RectAreaLight ceiling banks and culled pointLight desk lamps live in their
 * own components and are mounted by `<World/>` at floor-level positions.
 */
export function Lighting() {
	const { gl } = useThree();

	useEffect(() => {
		gl.toneMapping = ACESFilmicToneMapping;
		gl.toneMappingExposure = 1.0;
		gl.outputColorSpace = SRGBColorSpace;
	}, [gl]);

	return (
		<>
			<Environment files={HDRI_PATH} background={false} environmentIntensity={0.6} />
			<directionalLight
				position={[20, 30, 10]}
				intensity={0.4}
				color="#E8ECEE"
				castShadow
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-bias={-0.0005}
				shadow-camera-far={80}
			/>
		</>
	);
}
