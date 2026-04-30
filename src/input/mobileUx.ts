/**
 * Mobile UX helpers (PRQ-B9, M5). Pure-data: tap-target sizing,
 * safe-area inset utilities. Consumers wrap React style props through
 * these so a future polish pass can tune the constants in one place.
 *
 * Spec §22.2 mobile-UX bullet list: tap-target sizing, safe-area
 * insets, haptics, pinch-zoom. Haptics integrate via @capacitor/haptics
 * which is already in package.json; the surface ships in M7 native
 * packaging where the device is available to invoke them.
 */

/** Apple HIG / Material recommended minimum tap target size. */
export const MIN_TAP_TARGET_PX = 44;

export interface SafeAreaInsets {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

/** Round up small dimensions to the minimum tap target so on-canvas
 *  hit regions stay finger-friendly across iOS + Android. */
export function expandTapTarget(px: number): number {
	if (px < MIN_TAP_TARGET_PX) return MIN_TAP_TARGET_PX;
	return px;
}

/** Convert SafeAreaInsets into CSS padding props. The runtime reads
 *  the values from `env(safe-area-inset-*)` via a small DOM probe,
 *  passes them here, and applies the result to surface containers. */
export function safeAreaPadding(insets: SafeAreaInsets): {
	paddingTop: string;
	paddingRight: string;
	paddingBottom: string;
	paddingLeft: string;
} {
	return {
		paddingTop: `${insets.top}px`,
		paddingRight: `${insets.right}px`,
		paddingBottom: `${insets.bottom}px`,
		paddingLeft: `${insets.left}px`,
	};
}
