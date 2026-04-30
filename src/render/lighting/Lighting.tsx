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
			{/* Lighting cranked up because the HDRI emissive hemispheres
			    + per-cubicle RectAreaLights from spec §6 haven't shipped
			    binaries yet — without them the scene renders pitch-black.
			    These intensities keep walls/floor/ceiling legible at the
			    cost of the spec's intended moody office aesthetic; the
			    real fixture mounts will dial these back when they land. */}
			<ambientLight intensity={1.4} color="#f4f1ea" />
			{/* Hemisphere fill — paper-tinted ceiling, ink-tinted floor
			    so the two surfaces never collapse to pure black. */}
			<hemisphereLight args={['#f4f1ea', '#5a564f', 1.1]} />
			<directionalLight
				position={[20, 30, 10]}
				intensity={1.0}
				color="#f4f1ea"
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
			{/* Second directional from the opposite side fills the
			    ceiling-shadowed floor cells. */}
			<directionalLight position={[-15, 20, -10]} intensity={0.5} color="#e8ecee" />
		</>
	);
}
