import { motion } from 'framer-motion';
import { Button, pageFade } from '@/ui/primitives';

type Props = {
	onRestart: () => void;
	onExit: () => void;
	/** End-of-run stats; the host (Game.tsx) computes these. */
	stats?: {
		kills: number;
		deepestFloor: number;
		playedSeconds: number;
	};
};

/**
 * Game over (PRQ-14 T6, M2c6). Stamped TERMINATED message + end-of-
 * run stats line + two stamped buttons. Animates in via pageFade.
 *
 * Journal highlights (memo summaries) land in M5 BETA-POLISH alongside
 * the Tracery narrator.
 */
export function GameOver({ onRestart, onExit, stats }: Props) {
	return (
		<motion.div
			data-testid="game-over"
			variants={pageFade}
			initial="initial"
			animate="animate"
			style={{
				position: 'absolute',
				inset: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 'var(--space-5)',
				padding: 'var(--space-7)',
				background: 'var(--ink)',
				color: 'var(--paper)',
				zIndex: 1500,
			}}
		>
			<h1
				style={{
					margin: 0,
					fontFamily: 'var(--font-display)',
					fontSize: '2.5rem',
					letterSpacing: '0.12em',
					textTransform: 'uppercase',
					textAlign: 'center',
					color: 'var(--auditor-red)',
				}}
			>
				You have been
				<br />
				terminated
			</h1>
			<p
				style={{
					margin: 0,
					opacity: 0.75,
					maxWidth: '40ch',
					textAlign: 'center',
					fontFamily: 'var(--font-body)',
				}}
			>
				Your file has been redundantized. HR will be in touch.
			</p>
			{stats && (
				<dl
					data-testid="game-over-stats"
					style={{
						display: 'grid',
						gridTemplateColumns: 'auto auto',
						gap: 'var(--space-2) var(--space-5)',
						margin: 0,
						padding: 'var(--space-4) var(--space-5)',
						border: '1px solid var(--paper)',
						fontFamily: 'var(--font-mono)',
						fontSize: '0.85rem',
						letterSpacing: '0.04em',
					}}
				>
					<dt style={{ opacity: 0.6 }}>KILLS</dt>
					<dd style={{ margin: 0, textAlign: 'right' }}>{stats.kills}</dd>
					<dt style={{ opacity: 0.6 }}>DEEPEST FLOOR</dt>
					<dd style={{ margin: 0, textAlign: 'right' }}>{stats.deepestFloor}</dd>
					<dt style={{ opacity: 0.6 }}>PLAYED</dt>
					<dd style={{ margin: 0, textAlign: 'right' }}>{formatTime(stats.playedSeconds)}</dd>
				</dl>
			)}
			<div style={{ display: 'flex', gap: 'var(--space-3)' }}>
				<Button data-testid="restart" variant="auditor" onClick={onRestart}>
					RESTART
				</Button>
				<Button data-testid="quit-to-landing" variant="ghost" onClick={onExit}>
					QUIT TO LANDING
				</Button>
			</div>
		</motion.div>
	);
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}
