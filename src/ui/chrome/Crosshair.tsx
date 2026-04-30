type Props = {
	/** Show / hide the reticle. Game logic flips this true when the
	 *  camera-forward raycast hits an enemy in range. */
	visible: boolean;
};

/**
 * Center-screen crosshair. Hairline 4px cross, only visible when the
 * forward raycast is locked on a valid target. Hidden in pause /
 * radial / game-over.
 */
export function Crosshair({ visible }: Props) {
	if (!visible) return null;
	return (
		<div
			data-testid="crosshair"
			style={{
				position: 'absolute',
				top: '50%',
				left: '50%',
				width: 12,
				height: 12,
				transform: 'translate(-50%, -50%)',
				zIndex: 4,
				pointerEvents: 'none',
			}}
			aria-hidden
		>
			<div
				style={{
					position: 'absolute',
					top: '50%',
					left: 0,
					width: '100%',
					height: 1,
					background: 'var(--paper, #e8e6df)',
					transform: 'translateY(-50%)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: '50%',
					width: 1,
					height: '100%',
					background: 'var(--paper, #e8e6df)',
					transform: 'translateX(-50%)',
				}}
			/>
		</div>
	);
}
