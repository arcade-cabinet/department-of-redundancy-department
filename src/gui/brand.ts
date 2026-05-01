/**
 * Brand font registry. Files live under public/assets/fonts and the
 * @font-face declarations register them in index.html with font-display: block,
 * so the cabinet UI never momentarily renders in a system stack.
 *
 * Departure Mono — display / arcade glyph (score, lives, headers).
 * Inter         — body / numerics / readable copy.
 * JetBrains Mono — debug / dev overlays only.
 */
export const FONT_DISPLAY = 'Departure Mono';
export const FONT_BODY = 'Inter';
export const FONT_DEBUG = 'JetBrains Mono';

// Brand palette — pulled from docs/superpowers/specs/2026-04-30-arcade-rail-shooter-design.md
export const COLOR_INK = '#15181C';
export const COLOR_PAPER = '#F4F1EA';
export const COLOR_HP_HIGH = '#3FFF7F';
export const COLOR_HP_MID = '#FFA040';
export const COLOR_HP_LOW = '#FF3030';
export const COLOR_DIM = '#5A5A5A';
export const COLOR_MUTED = '#A0A0A0';
