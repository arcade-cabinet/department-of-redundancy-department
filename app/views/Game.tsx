import { useEffect } from 'react';

type Props = { onExit: () => void };

/**
 * Game view — PRQ-1.0 placeholder.
 *
 * The voxel/floor/maze/navmesh pre-pivot code has been deleted.
 * The rail-camera + first weapon + first enemy slice lands in PRQ-1.1+.
 */
export function Game({ onExit }: Props) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onExit();
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [onExit]);

	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#0a0a0a',
				color: '#e8e8e8',
				fontFamily: 'monospace',
				fontSize: '1.25rem',
				letterSpacing: '0.08em',
				textTransform: 'uppercase',
			}}
		>
			RAIL SHOOTER — PHASE 1 IN PROGRESS
		</div>
	);
}
