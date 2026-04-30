type Props = {
	current: number; // -1 = unlimited (melee)
	max: number;
	weaponName: string;
};

/**
 * Bottom-center ammo readout. Toner-cyan numerals on ink background.
 * Spec §11.4 calls for Departure Mono — the font isn't shipped yet, so
 * we fall back to ui-monospace; PRQ-14 polish wires the real font.
 *
 * "∞" appears for unlimited (melee weapons).
 */
export function AmmoCounter({ current, max, weaponName }: Props) {
	const display = current === -1 ? '∞' : `${current}/${max}`;
	return (
		<div
			data-testid="ammo-counter"
			style={{
				position: 'absolute',
				bottom: 16,
				left: '50%',
				transform: 'translateX(-50%)',
				padding: '0.4rem 0.8rem',
				background: 'var(--ink, #0d0f12)',
				color: 'var(--toner-cyan, #7CFFB8)',
				border: '1px solid var(--toner-cyan, #7CFFB8)',
				font: '13px ui-monospace, monospace',
				zIndex: 5,
				pointerEvents: 'none',
				display: 'flex',
				gap: '0.5rem',
				alignItems: 'baseline',
			}}
		>
			<span style={{ opacity: 0.7, fontSize: '0.75em' }}>{weaponName.toUpperCase()}</span>
			<span style={{ fontVariantNumeric: 'tabular-nums' }}>{display}</span>
		</div>
	);
}
