import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { MathUtils, type PerspectiveCamera as PerspectiveCameraImpl } from 'three';

type Props = {
	/** Player eye height in world units. Spec §5: 1.6u. */
	eyeHeight?: number;
	/** XZ position. Defaults to maze origin (center cubicle). */
	position?: [number, number];
	/** Yaw in radians (0 = looking down -Z). */
	yaw?: number;
	/** Pitch in radians. Negative tilts down. */
	pitch?: number;
	/** Vertical FOV at the *reference* aspect 16:9. Adjusted at runtime so
	 *  the same cubicle width fits across any viewport aspect. */
	referenceFovDeg?: number;
};

const REFERENCE_ASPECT = 16 / 9;

/**
 * First-person camera that scales FOV to the viewport aspect, so a fixed
 * physical cell size (2.6u cubicle) reads at the same horizontal extent
 * whether the player is on a phone, a desktop, or a stretched widescreen.
 *
 * The trick: we keep the *horizontal* FOV stable across aspects. Three.js
 * cameras only expose vertical FOV, so when aspect drops below the
 * reference (taller viewport), we *increase* vertical FOV proportionally.
 * On wider-than-reference viewports we keep vFOV at the reference and let
 * the natural increase in horizontal FOV give the player extra peripheral
 * vision (cubicles read wider, but the same fixed-cell distance is in view).
 *
 * On real PRQ-05 input + spec §5 mobile-first, this prevents the
 * portrait-phone case from jamming the camera into a wall.
 */
export function PlayerCamera({
	eyeHeight = 1.6,
	position = [0, 0],
	yaw = 0,
	pitch = 0,
	referenceFovDeg = 70,
}: Props) {
	const { camera, size } = useThree();

	const targetFov = useMemo(() => {
		const aspect = size.width / Math.max(1, size.height);
		if (aspect >= REFERENCE_ASPECT) return referenceFovDeg;
		// h-FOV at reference: 2 * atan(tan(vFov/2) * REFERENCE_ASPECT)
		const referenceVFovRad = MathUtils.degToRad(referenceFovDeg);
		const referenceHFovRad = 2 * Math.atan(Math.tan(referenceVFovRad / 2) * REFERENCE_ASPECT);
		// Solve for new vFOV that keeps the same hFOV at this aspect:
		// tan(vFov/2) = tan(hFov/2) / aspect
		const newVFovRad = 2 * Math.atan(Math.tan(referenceHFovRad / 2) / aspect);
		return MathUtils.radToDeg(newVFovRad);
	}, [size.width, size.height, referenceFovDeg]);

	useEffect(() => {
		const cam = camera as PerspectiveCameraImpl;
		cam.position.set(position[0], eyeHeight, position[1]);
		// Apply yaw then pitch via Euler order YXZ so pitch acts in camera
		// space (look up/down) rather than rolling around the world axis.
		cam.rotation.order = 'YXZ';
		cam.rotation.set(pitch, yaw, 0);
		cam.fov = targetFov;
		cam.aspect = size.width / Math.max(1, size.height);
		cam.updateProjectionMatrix();
	}, [camera, size.width, size.height, position, eyeHeight, yaw, pitch, targetFov]);

	return null;
}
