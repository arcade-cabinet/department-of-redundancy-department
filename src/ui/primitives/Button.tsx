import { type MotionStyle, motion } from 'framer-motion';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { stampPress } from './motion';

/**
 * Brand button (PRQ-14 T3). Default = stamped paper button: paper
 * background, ink text, hairline ink border, stamp-press on click.
 *
 * `variant`:
 *   - 'paper' (default) — stamp on paper.
 *   - 'auditor' — auditor-red background, paper text. Use for primary
 *     actions / destructive confirms.
 *   - 'ghost' — transparent + paper text + hairline border. Use for
 *     dialog cancel / secondary actions.
 */

type Variant = 'paper' | 'auditor' | 'ghost';

interface BaseProps
	extends Omit<
		ButtonHTMLAttributes<HTMLButtonElement>,
		| 'ref'
		| 'onAnimationStart'
		| 'onAnimationEnd'
		| 'onAnimationIteration'
		| 'onDrag'
		| 'onDragStart'
		| 'onDragEnd'
	> {
	variant?: Variant;
}

// `ghost` reads color + border from the surrounding context via
// `currentColor` so the same variant works both on the paper PauseMenu
// (ink text) and over the HUD's ink-colored chrome (paper text).
const STYLES: Record<Variant, React.CSSProperties> = {
	paper: {
		background: 'var(--paper)',
		color: 'var(--ink)',
		border: '1px solid var(--ink)',
	},
	auditor: {
		background: 'var(--auditor-red)',
		color: 'var(--paper)',
		border: 'none',
	},
	ghost: {
		background: 'transparent',
		color: 'inherit',
		border: '1px solid currentColor',
	},
};

const BASE_STYLE: React.CSSProperties = {
	padding: 'var(--space-3) var(--space-5)',
	fontFamily: 'var(--font-display)',
	fontSize: '0.95rem',
	letterSpacing: '0.1em',
	textTransform: 'uppercase',
	cursor: 'pointer',
	borderRadius: 'var(--radius-1)',
	boxShadow: 'var(--shadow-paper-drop)',
};

export const Button = forwardRef<HTMLButtonElement, BaseProps>(function Button(
	{ variant = 'paper', style, type = 'button', children, ...rest },
	ref,
) {
	return (
		<motion.button
			ref={ref}
			type={type}
			variants={stampPress}
			initial="initial"
			animate="animate"
			whileTap="whileTap"
			style={{ ...BASE_STYLE, ...STYLES[variant], ...style } as MotionStyle}
			{...rest}
		>
			{children}
		</motion.button>
	);
});
