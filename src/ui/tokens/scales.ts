/**
 * Design-token scales (PRQ-14 T2). Spec §11 brand: tight grid, paper +
 * ink palette, two motion speeds. The numeric keys mirror Tailwind's
 * convention so consumers can compose `spacing[3] + spacing[4]`.
 *
 * The CSS-custom-property mirror in app/styles.css lets non-React
 * surfaces (e.g. raw `<div style>` overrides in tests) share the same
 * vocabulary. tailwind.config consumes this module.
 */

export const spacing = {
	0: '0px',
	1: '4px',
	2: '8px',
	3: '12px',
	4: '16px',
	5: '24px',
	6: '32px',
	7: '48px',
	8: '64px',
} as const;

export const radius = {
	0: '0px',
	1: '2px',
	2: '4px',
	3: '8px',
} as const;

export const shadow = {
	/** Paper-on-paper drop. Use for cards, dialogs, raised buttons. */
	paperDrop: '0 1px 2px rgba(21, 24, 28, 0.18), 0 2px 4px rgba(21, 24, 28, 0.10)',
	/** Deep modal / overlay shadow. */
	deep: '0 8px 24px rgba(21, 24, 28, 0.36), 0 2px 6px rgba(21, 24, 28, 0.20)',
} as const;

export const motion = {
	duration: {
		instant: 80,
		fast: 160,
		base: 240,
		slow: 480,
	},
	easing: {
		/** Material-ish in-out for content entering. */
		entrance: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
		/** Snappier accelerated curve for content leaving. */
		exit: 'cubic-bezier(0.4, 0.0, 1, 1)',
	},
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
