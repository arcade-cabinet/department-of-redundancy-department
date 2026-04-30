import { motion } from 'framer-motion';
import { Button, pageFade } from '@/ui/primitives';

/**
 * EmployeeFile (PRQ-14 T6, M2c6). Saved-game browser surface.
 * Alpha = single autosave; the spec calls for a list of saves.
 *
 * Wired by app/main routing (PRQ-14 T8 in M2c8) to land between
 * Landing and Game when the player has any prior progress. The host
 * supplies the save record; this view is presentational.
 */

export interface EmployeeFileSave {
	floor: number;
	kills: number;
	playedSeconds: number;
	threat: number;
	deaths: number;
	/** Per-archetype kill breakdown. Optional — alpha may aggregate. */
	killsBySlug?: Readonly<Record<string, number>>;
}

type Props = {
	save: EmployeeFileSave | null;
	onResume: () => void;
	onNewGame: () => void;
	onBack: () => void;
};

export function EmployeeFile({ save, onResume, onNewGame, onBack }: Props) {
	return (
		<motion.main
			data-testid="employee-file"
			variants={pageFade}
			initial="initial"
			animate="animate"
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 'var(--space-5)',
				padding: 'var(--space-7)',
				background: 'var(--ink)',
				color: 'var(--paper)',
			}}
		>
			<h1
				style={{
					margin: 0,
					fontFamily: 'var(--font-display)',
					fontSize: '2rem',
					letterSpacing: '0.1em',
					textTransform: 'uppercase',
				}}
			>
				Employee File
			</h1>
			{save ? (
				<dl style={statsGrid} data-testid="save-stats">
					<dt style={statKey}>FLOOR</dt>
					<dd style={statVal}>{save.floor}</dd>
					<dt style={statKey}>KILLS</dt>
					<dd style={statVal}>{save.kills}</dd>
					<dt style={statKey}>THREAT</dt>
					<dd style={statVal}>{save.threat.toFixed(1)}</dd>
					<dt style={statKey}>DEATHS</dt>
					<dd style={statVal}>{save.deaths}</dd>
					<dt style={statKey}>PLAYED</dt>
					<dd style={statVal}>{formatTime(save.playedSeconds)}</dd>
				</dl>
			) : (
				<p style={{ opacity: 0.7, fontFamily: 'var(--font-body)' }}>No active record.</p>
			)}
			<div style={{ display: 'flex', gap: 'var(--space-3)' }}>
				{save && (
					<Button data-testid="resume" variant="auditor" onClick={onResume}>
						RESUME
					</Button>
				)}
				<Button data-testid="new-game" variant="paper" onClick={onNewGame}>
					{save ? 'NEW GAME (CLEAR)' : 'NEW GAME'}
				</Button>
				<Button data-testid="back" variant="ghost" onClick={onBack}>
					BACK
				</Button>
			</div>
		</motion.main>
	);
}

const statsGrid: React.CSSProperties = {
	display: 'grid',
	gridTemplateColumns: 'auto auto',
	gap: 'var(--space-2) var(--space-6)',
	margin: 0,
	padding: 'var(--space-5) var(--space-6)',
	border: '1px solid var(--paper)',
	fontFamily: 'var(--font-mono)',
	fontSize: '1rem',
	letterSpacing: '0.04em',
};

const statKey: React.CSSProperties = { opacity: 0.6 };
const statVal: React.CSSProperties = { margin: 0, textAlign: 'right' };

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}
