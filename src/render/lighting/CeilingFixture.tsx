import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

// Initialize RectAreaLight uniforms once. Three.js doesn't auto-load these and
// without them rect lights render as point sources.
RectAreaLightUniformsLib.init();

type Props = {
	/** World-space center of the fixture (typically ceiling-Y of the cubicle bank). */
	position: [number, number, number];
	/** Bank dimensions in world units. Defaults to a 4×1.2 fixture. */
	width?: number;
	height?: number;
	/** Diffuser brightness — paper-warm fluorescent at 1.4 by default. */
	intensity?: number;
	/** Color tint of the fluorescent diffuser. Spec §6 default = paper-warm `#F4F1EA`. */
	color?: string;
};

/**
 * One ceiling-mounted RectAreaLight per cubicle bank. Faces straight down
 * by default (rotation x=-PI/2). RectAreaLights affect only physical
 * materials (MeshStandardMaterial / MeshPhysicalMaterial), which matches
 * our locked render config.
 *
 * Note: RectAreaLight does NOT cast shadows in three.js — that's by design
 * upstream, not a config gap on our end. Shadow casting comes from the
 * `<directionalLight/>` in `<Lighting/>`.
 *
 * The N-fixture-per-bank cull is naturally handled by view-frustum culling
 * once chunks evict; for tighter control, the `<DeskLamp/>` distance-cull
 * primitive can be reused if profiling shows RectAreaLight perf as the
 * culprit.
 */
export function CeilingFixture({
	position,
	width = 4,
	height = 1.2,
	intensity = 1.4,
	color = '#F4F1EA',
}: Props) {
	return (
		<rectAreaLight
			args={[color, intensity, width, height]}
			position={position}
			rotation={[-Math.PI / 2, 0, 0]}
		/>
	);
}
