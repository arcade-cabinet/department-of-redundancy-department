type Props = { onClockIn: () => void };

export function Landing({ onClockIn }: Props) {
	return (
		<main
			data-testid="landing"
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '1.5rem',
			}}
		>
			<h1
				style={{
					fontFamily: 'var(--font-display, monospace)',
					fontSize: '3rem',
					letterSpacing: '0.04em',
					textTransform: 'uppercase',
				}}
			>
				Department of Redundancy Department
			</h1>
			<p style={{ opacity: 0.7 }}>There has been a reorganization.</p>
			<button
				type="button"
				data-testid="clock-in"
				onClick={onClockIn}
				style={{
					padding: '0.75rem 2rem',
					background: 'var(--auditor-red)',
					color: 'var(--paper)',
					border: 'none',
					fontFamily: 'inherit',
					fontSize: '1rem',
					letterSpacing: '0.1em',
					cursor: 'pointer',
				}}
			>
				CLOCK IN
			</button>
		</main>
	);
}
