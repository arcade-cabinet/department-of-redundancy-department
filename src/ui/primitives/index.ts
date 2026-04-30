/**
 * UI primitives barrel (PRQ-14 T3, M2c5).
 *
 * Wrappers around Radix UI + framer-motion preserving the brand
 * stamp-on-paper aesthetic. Consumers import from
 * `@/ui/primitives` instead of `@radix-ui/*` directly so the brand
 * stays consistent across surfaces.
 */
export { Button } from './Button';
export { Dialog } from './Dialog';
export { flickerOnce, pageFade, paperShift, stampPress } from './motion';
export { Slider } from './Slider';
export { Tabs } from './Tabs';
