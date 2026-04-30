/**
 * WCAG 2.1 contrast math (PRQ-RC1, M6). Pure-data: caller passes hex
 * colors, gets back the 1..21 contrast ratio + AA/AAA gate predicates.
 *
 * Used by: a snapshot test that walks every brand color pair against
 * the spec §11 typography rules; PauseMenu's settings panel where the
 * graphics-tier dropdown shows the active palette's worst-pair ratio.
 */

export type WCAGSize = 'normal' | 'large';

export function contrastRatio(fg: string, bg: string): number {
	const lf = relativeLuminance(parseHex(fg));
	const lb = relativeLuminance(parseHex(bg));
	const lighter = Math.max(lf, lb);
	const darker = Math.min(lf, lb);
	return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWCAG_AA(ratio: number, size: WCAGSize): boolean {
	return ratio >= (size === 'large' ? 3 : 4.5);
}

export function meetsWCAG_AAA(ratio: number, size: WCAGSize): boolean {
	return ratio >= (size === 'large' ? 4.5 : 7);
}

interface RGB {
	r: number;
	g: number;
	b: number;
}

function parseHex(hex: string): RGB {
	const h = hex.startsWith('#') ? hex.slice(1) : hex;
	const expanded =
		h.length === 3
			? h
					.split('')
					.map((c) => c + c)
					.join('')
			: h;
	const r = parseInt(expanded.slice(0, 2), 16);
	const g = parseInt(expanded.slice(2, 4), 16);
	const b = parseInt(expanded.slice(4, 6), 16);
	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
		throw new Error(`bad hex: ${hex}`);
	}
	return { r, g, b };
}

function channel(c: number): number {
	const s = c / 255;
	return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb: RGB): number {
	return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}
