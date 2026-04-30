import type { Variants } from 'framer-motion';

/**
 * Reusable Framer Motion variants library (PRQ-14 T3, M2c5).
 *
 * Spec §11.2 brand: paper-shift on hover, stamp-press on click, page
 * fade between views, lights-flicker-once on entry. Each variant is
 * composed via the `variants={}` prop of motion components or used
 * directly as `whileHover` / `whileTap` arguments.
 *
 * Durations + easings come from the design-token motion scale
 * (src/ui/tokens/scales.ts) so a future tuning pass touches one
 * source.
 */

const FAST_S = 0.16;
const BASE_S = 0.24;
const SLOW_S = 0.48;
const ENTRANCE_EASE = [0.2, 0.8, 0.2, 1] as const;

/** Subtle paper-on-paper offset on hover. Used for cards + buttons. */
export const paperShift = {
	initial: { x: 0, y: 0 },
	animate: { x: 0, y: 0, transition: { duration: FAST_S } },
	whileHover: { x: -1, y: -1, transition: { duration: FAST_S } },
	whileTap: { x: 0, y: 0, transition: { duration: FAST_S / 2 } },
} as const;

/** Quick scale-down on click — feels like a stamp pressing into paper. */
export const stampPress = {
	initial: { scale: 1 },
	animate: { scale: 1, transition: { duration: FAST_S } },
	whileTap: { scale: 0.96, transition: { duration: FAST_S / 2 } },
} as const;

/** Page-fade between views. Use as `variants={pageFade}` with `initial="initial"`,
 *  `animate="animate"`, `exit="exit"` on the host AnimatePresence. */
export const pageFade: Variants = {
	initial: { opacity: 0 },
	animate: { opacity: 1, transition: { duration: BASE_S, ease: ENTRANCE_EASE } },
	exit: { opacity: 0, transition: { duration: FAST_S } },
};

/** Lights-flicker-once on entry — three brief dips before settling.
 *  Used on Landing page mount per spec §11.3. */
export const flickerOnce: Variants = {
	initial: { opacity: 0 },
	animate: {
		opacity: [0, 1, 0.4, 1, 0.7, 1],
		transition: { duration: SLOW_S, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
	},
};
