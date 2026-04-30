type Props = { floor: number };

/**
 * Top-left current-floor stamp. Reads "FLOOR 003" with leading zeros
 * (spec §11 brand chrome) — pulls a corporate-record visual identity.
 */
export function FloorStamp({ floor }: Props) {
	const padded = String(floor).padStart(3, '0');
	return (
		<div
			data-testid="floor-stamp"
			style={{
				position: 'absolute',
				top: 16,
				left: 16,
				padding: '0.25rem 0.6rem',
				font: '11px ui-monospace, monospace',
				color: 'var(--paper, #e8e6df)',
				background: 'var(--ink, #0d0f12)',
				border: '1px solid currentColor',
				letterSpacing: '0.2em',
				zIndex: 5,
				pointerEvents: 'none',
			}}
		>
			FLOOR {padded}
		</div>
	);
}
