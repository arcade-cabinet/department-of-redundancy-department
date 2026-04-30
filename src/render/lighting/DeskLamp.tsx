type Props = {
	position: [number, number, number];
	/** Whether this lamp is currently in the active set (set by the culler upstream). */
	active: boolean;
	intensity?: number;
	distance?: number;
	color?: string;
};

/**
 * Per-occupied-cubicle warm desk lamp. The active flag is computed by the
 * culler (`PointLightCuller.cullByDistance`) and passed down as a prop.
 *
 * Inactive lamps unmount entirely. CodeRabbit (PR #8) flagged that
 * three.js r184 still includes intensity=0 PointLights in the
 * NUM_POINT_LIGHTS shader define and the per-fragment light loop, so
 * gating via intensity defeated the cull's purpose. Unmounting is the
 * right call — the cull is throttled to 5Hz (only fires when the player
 * crosses a cubicle boundary) so the shader recompile cost is one-time
 * per crossing, not per-frame.
 */
export function DeskLamp({
	position,
	active,
	intensity = 0.8,
	distance = 4,
	color = '#FFD9A0',
}: Props) {
	if (!active) return null;
	return (
		<pointLight
			position={position}
			intensity={intensity}
			distance={distance}
			color={color}
			decay={2}
		/>
	);
}
