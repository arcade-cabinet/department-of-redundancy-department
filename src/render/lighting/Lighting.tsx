/**
 * Render config from spec §6:
 *
 * - The HDRI is NOT loaded as drei <Environment/>. Instead the player is
 *   always inside an enclosed cubicle maze, so the skybox is never
 *   visible, and we get more visual mileage by projecting the HDRI's
 *   upper hemisphere as the ceiling's emissiveMap and the lower
 *   hemisphere as the floor's emissiveMap (see hdriProjection.ts +
 *   useHdriHemispheres). The HDR luminance literally becomes the
 *   indirect lighting — more grounded look than IBL.
 *
 * - <CeilingFixture/> RectAreaLights per cubicle (mounted by
 *   <CubicleMaze/>) provide direct fluorescent fill on top of the
 *   emissive ceiling.
 *
 * - <DeskLamp/> per occupied cubicle, distance-culled.
 *
 * - Low-intensity ambient light (#E8ECEE @ 0.12) prevents pitch-black
 *   corners where rectAreas + emissive don't reach (e.g. inside a
 *   cubicle with lights too far away to light the lower walls).
 *
 * - One directional light from upper-Y for shadow casting — cubicle
 *   walls cast hard shadows over desks → scene reads as architectural
 *   rather than uniformly flat.
 *
 * - NO scene.fog. Maze walls bound visibility.
 *
 * Tonemap + sRGB output are configured at the `<Canvas gl=...>` prop level
 * in `app/views/Game.tsx`, not here — R3F idiom, avoids mid-tree overwrites.
 */
export function Lighting() {
	return (
		<>
			<ambientLight intensity={0.12} color="#E8ECEE" />
			<directionalLight
				position={[20, 30, 10]}
				intensity={0.35}
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
