type Props = {
	/** 0..1 threat level — drives the strip fill. */
	threat: number;
};

/**
 * Top-right threat strip. Auditor-red fill on a paper background, rises
 * smoothly with `threat`. Spec §11.4: redacted-document feel — black
 * bar overlays + subtle noise; PRQ-14 adds the noise layer.
 *
 * Smooth fill via CSS `width` transition (we deliberately skip
 * framer-motion here — a simple width transition reads identical at
 * the strip's small size and saves the bundle).
 */
export function ThreatStrip({ threat }: Props) {
	const pct = Math.max(0, Math.min(1, threat)) * 100;
	return (
		<div
			data-testid="threat-strip"
			style={{
				position: 'absolute',
				top: 16,
				right: 16,
				width: 200,
				height: 14,
				background: 'var(--paper, #e8e6df)',
				border: '2px solid var(--ink, #0d0f12)',
				zIndex: 5,
				pointerEvents: 'none',
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					height: '100%',
					width: `${pct}%`,
					background: 'var(--auditor-red, #E53D3D)',
					transition: 'width 250ms ease-out',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					font: '10px ui-monospace, monospace',
					color: 'var(--ink, #0d0f12)',
					letterSpacing: '0.1em',
					mixBlendMode: 'difference',
				}}
			>
				THREAT {Math.round(pct)}
			</div>
		</div>
	);
}
