type Props = {
	onRestart: () => void;
	onExit: () => void;
};

/**
 * Placeholder game-over screen (spec §19.2 `GameOver` route stub).
 * PRQ-14 polishes the visuals + adds the end-of-run report (kill
 * counts, deepest floor, journal highlights). For now: dark scrim +
 * the message + two buttons.
 */
export function GameOver({ onRestart, onExit }: Props) {
	return (
		<div
			data-testid="game-over"
			style={{
				position: 'absolute',
				inset: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '1.5rem',
				padding: '2rem',
				background: 'var(--ink, #0d0f12)',
				color: 'var(--paper, #e8e6df)',
				font: '14px ui-monospace, monospace',
				zIndex: 1500,
			}}
		>
			<h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.1em' }}>
				YOU HAVE BEEN TERMINATED
			</h1>
			<p style={{ margin: 0, opacity: 0.7, maxWidth: '40ch', textAlign: 'center' }}>
				Your file has been redundantized. HR will be in touch.
			</p>
			<div style={{ display: 'flex', gap: '0.75rem' }}>
				<button type="button" data-testid="restart" onClick={onRestart} style={btn}>
					RESTART
				</button>
				<button type="button" data-testid="quit-to-landing" onClick={onExit} style={btn}>
					QUIT TO LANDING
				</button>
			</div>
		</div>
	);
}

const btn: React.CSSProperties = {
	padding: '0.5rem 1.25rem',
	background: 'transparent',
	color: 'inherit',
	border: '1px solid currentColor',
	font: 'inherit',
	cursor: 'pointer',
};
