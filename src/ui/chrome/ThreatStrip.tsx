import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { crossedThresholdUp, tierFor } from '@/combat/threat';

type Props = {
	/** Raw threat scalar (0..∞). Spec §10. */
	threat: number;
	/** Visual cap — at and above this value the strip is fully filled.
	 *  Default 8 (the squad-tier threshold), so the bar maxes out as the
	 *  player enters squad-tier territory. */
	visualCap?: number;
};

/**
 * Top-right threat strip. Auditor-red fill rises with `threat`; on a
 * tier-threshold cross (2 / 4 / 5 / 8) it fires a brief scale-pulse so
 * the player sees the moment the spawn pool just expanded. PRQ-09
 * shipped the static strip; this rev wires the pulse animation per
 * PRQ-10 T7.
 */
export function ThreatStrip({ threat, visualCap = 8 }: Props) {
	const pct = Math.max(0, Math.min(1, threat / visualCap)) * 100;
	const controls = useAnimationControls();
	const prevRef = useRef(threat);

	useEffect(() => {
		const prev = prevRef.current;
		prevRef.current = threat;
		const crossed = crossedThresholdUp(prev, threat);
		if (crossed === null) return;
		// Pulse: scale-up from 1 → 1.12 → 1, 280ms.
		void controls.start({
			scale: [1, 1.12, 1],
			transition: { duration: 0.28, ease: 'easeOut' },
		});
	}, [threat, controls]);

	const tier = tierFor(threat);
	return (
		<motion.div
			data-testid="threat-strip"
			data-tier={tier}
			animate={controls}
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
				transformOrigin: '100% 50%',
			}}
		>
			<motion.div
				animate={{ width: `${pct}%` }}
				transition={{ duration: 0.25, ease: 'easeOut' }}
				style={{
					height: '100%',
					background: 'var(--auditor-red, #E53D3D)',
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
				THREAT {threat.toFixed(1)}
			</div>
		</motion.div>
	);
}
