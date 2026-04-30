import { Environment } from '@react-three/drei';

const HDRI_PATH = '/assets/hdri/unfinished_office_2k.hdr';

/**
 * Render config from spec §6:
 * - HDRI Environment (PolyHaven unfinished_office)
 * - DirectionalLight from upper-Y, cool-white, casts shadows over the
 *   playable floor area (one chunk = 16×16u, so frustum is sized to span
 *   ≥32u on all sides).
 * - NO scene.fog (chunk culling gates draw distance — PRQ-03).
 *
 * Tonemap + sRGB output are configured at the `<Canvas gl=...>` prop level
 * in `app/views/Game.tsx`, not here — that's the R3F idiom and avoids
 * mutating renderer state mid-tree where any drei helper could overwrite
 * it later.
 */
export function Lighting() {
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
				shadow-camera-far={120}
				shadow-camera-left={-32}
				shadow-camera-right={32}
				shadow-camera-top={32}
				shadow-camera-bottom={-32}
			/>
		</>
	);
}
