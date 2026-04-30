import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import * as prefs from '@/db/preferences';
import { Button, flickerOnce } from '@/ui/primitives';

type Props = { onClockIn: () => void };

/**
 * Landing page (PRQ-14 T4, M2c6). Full brand pass — Departure Mono
 * display type, hairline-rule tagline, lights-flicker-once entry,
 * stamped CLOCK IN / RESUME button.
 *
 * The HDRI-lit middle-manager hero from spec §11.3 lands in M2c8 once
 * the snapshot baseline pass needs the GLB on screen for visual
 * regression. Today the surface is structural + typographic.
 */
export function Landing({ onClockIn }: Props) {
	const [lastFloor, setLastFloor] = useState<number>(1);

	useEffect(() => {
		let alive = true;
		prefs
			.get('last_floor')
			.then((v) => {
				if (alive) setLastFloor(v);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);

	const label = lastFloor > 1 ? `RESUME ON FLOOR ${lastFloor}` : 'CLOCK IN';

	return (
		<motion.main
			data-testid="landing"
			variants={flickerOnce}
			initial="initial"
			animate="animate"
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 'var(--space-6)',
				padding: 'var(--space-7)',
				background: 'var(--ink)',
				color: 'var(--paper)',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 'var(--space-3)',
				}}
			>
				<h1
					style={{
						margin: 0,
						fontFamily: 'var(--font-display)',
						fontSize: '3.5rem',
						letterSpacing: '0.06em',
						textTransform: 'uppercase',
						lineHeight: 1.05,
						textAlign: 'center',
					}}
				>
					Department of
					<br />
					Redundancy Department
				</h1>
				<div
					style={{
						width: 'min(420px, 80vw)',
						height: 1,
						background: 'var(--paper)',
						opacity: 0.4,
					}}
				/>
				<p
					style={{
						margin: 0,
						fontFamily: 'var(--font-mono)',
						fontSize: '0.9rem',
						letterSpacing: '0.08em',
						opacity: 0.7,
						textTransform: 'uppercase',
					}}
				>
					There has been a reorganization
				</p>
			</div>
			<Button
				data-testid="clock-in"
				variant="auditor"
				onClick={onClockIn}
				style={{ minWidth: 240, padding: 'var(--space-3) var(--space-6)' }}
			>
				{label}
			</Button>
		</motion.main>
	);
}
