type Props = {
	weaponSlug: string | null;
};

/**
 * Bottom-left current-weapon icon. Placeholder text glyph until PRQ-14
 * design pass swaps in real per-weapon icons. Sits beside the HpBar so
 * the player has a single corner glance for "what am I carrying / how
 * much HP do I have."
 */
export function WeaponIcon({ weaponSlug }: Props) {
	const label = weaponSlug ? weaponSlug.replace(/-/g, ' ').toUpperCase() : 'NO WEAPON';
	return (
		<div
			data-testid="weapon-icon"
			style={{
				position: 'absolute',
				bottom: 38, // sits above HpBar
				left: 16,
				padding: '0.2rem 0.5rem',
				font: '10px ui-monospace, monospace',
				color: 'var(--paper, #e8e6df)',
				background: 'var(--ink, #0d0f12)',
				border: '1px solid currentColor',
				letterSpacing: '0.15em',
				zIndex: 5,
				pointerEvents: 'none',
			}}
		>
			{label}
		</div>
	);
}
