type Props = {
	position: [number, number, number];
	/** Whether this lamp is currently in the active set (set by the culler upstream). */
	active: boolean;
	intensity?: number;
	distance?: number;
	color?: string;
};

/**
 * Per-occupied-cubicle warm desk lamp. The active flag is computed once per
 * frame by the culler (`PointLightCuller.cullByDistance`) and passed down
 * as a prop. Inactive lamps render with intensity 0 so we don't pay the
 * per-light shader cost on materials that already evaluate the lighting
 * equation.
 *
 * Why intensity-zero rather than unmount? PointLights are cheap to *mount*
 * but expensive to *evaluate per fragment*. three.js compiles shader
 * variants per active light count, so churning mounts every frame
 * recompiles shaders — a 60ms hitch each time. Mount once, gate via
 * intensity, recompile once at scene init.
 *
 * Note: the culler change rate (active flips) is much lower than 60Hz —
 * only when the player moves between cubicle banks. React reconciliation
 * handles the prop diff cleanly; no useFrame override needed.
 */
export function DeskLamp({
	position,
	active,
	intensity = 0.8,
	distance = 4,
	color = '#FFD9A0',
}: Props) {
	return (
		<pointLight
			position={position}
			intensity={active ? intensity : 0}
			distance={distance}
			color={color}
			decay={2}
		/>
	);
}
