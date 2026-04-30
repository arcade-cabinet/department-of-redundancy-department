import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/**
 * Full-screen black fade-cut for floor transitions (PRQ-12 T2).
 *
 * Lifecycle:
 *   - active=true → fade to opaque over 200ms
 *   - onMidpoint() called when fully opaque (host runs the floor swap)
 *   - then fade back to transparent over 200ms
 *   - onComplete() called when fully transparent (host clears state)
 *
 * Total ~400ms; spec PRQ-12 §T2 notes: extend to 250+250 if mobile
 * generation exceeds the 200ms window. We expose `fadeMs` so a host
 * can dial that up without forking the component.
 */

const DEFAULT_FADE_MS = 200;

export interface TransitionProps {
	active: boolean;
	onMidpoint?: () => void;
	onComplete?: () => void;
	fadeMs?: number;
}

export function Transition({
	active,
	onMidpoint,
	onComplete,
	fadeMs = DEFAULT_FADE_MS,
}: TransitionProps) {
	// Keep the overlay mounted so AnimatePresence isn't required; just
	// drive opacity via the prop. Local 'phase' tracks fade-in / hold /
	// fade-out so onMidpoint fires exactly once per activation.
	const [phase, setPhase] = useState<'idle' | 'fade-in' | 'fade-out'>('idle');
	const firedMidpoint = useRef(false);

	useEffect(() => {
		if (active && phase === 'idle') {
			firedMidpoint.current = false;
			setPhase('fade-in');
		}
		// Host aborted mid-transition: collapse to idle. Without this, a
		// cancel during fade-in left the overlay stuck opaque,
		// deadlocking the input layer. Note: natural fade-out completion
		// also calls onComplete from the animation handler — that's
		// fine, hosts treat it as a "swap done" signal and idempotent
		// state resets.
		if (!active && phase === 'fade-in') {
			setPhase('idle');
			if (onComplete) onComplete();
		}
	}, [active, phase, onComplete]);

	// Opacity is purely a function of phase. Letting `active` gate the
	// fade-out value caused opacity to stay at 1 throughout fade-out
	// (no animation, onAnimationComplete never fires, overlay stuck).
	const opacity = phase === 'fade-in' ? 1 : 0;

	return (
		<motion.div
			data-testid="floor-transition"
			data-phase={phase}
			initial={{ opacity: 0 }}
			animate={{ opacity }}
			transition={{ duration: fadeMs / 1000, ease: 'linear' }}
			onAnimationComplete={() => {
				if (phase === 'fade-in' && !firedMidpoint.current) {
					firedMidpoint.current = true;
					if (onMidpoint) onMidpoint();
					setPhase('fade-out');
					return;
				}
				if (phase === 'fade-out') {
					setPhase('idle');
					if (onComplete) onComplete();
				}
			}}
			style={{
				position: 'fixed',
				inset: 0,
				background: '#000',
				pointerEvents: phase === 'idle' ? 'none' : 'auto',
				zIndex: 100,
			}}
			aria-hidden={phase === 'idle'}
		/>
	);
}
