import * as Popover from '@radix-ui/react-popover';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { SurfaceKind } from '@/input/surfaceKind';
import { optionsFor, type RadialOption } from './options';

type Props = {
	/** Screen-space anchor (the hold-fired pointer position). When null,
	 *  the menu is closed. */
	anchor: { x: number; y: number } | null;
	/** What the player tapped on. Drives the option set via optionsFor(). */
	surface: SurfaceKind | null;
	/** Fired when the player picks an option. Host dispatches the action;
	 *  RadialMenu then auto-dismisses via the parent setting anchor=null. */
	onPick: (option: RadialOption) => void;
	/** Fired when the menu closes (Escape, click-away, post-pick). */
	onClose: () => void;
	/** Arc radius in CSS px. Default 90 — tested ergonomically against
	 *  thumb reach on a 6-inch phone. */
	radius?: number;
};

const ARC_DEGREES = 270; // 5 slots spread across most of a circle, leaving a gap at the bottom for the thumb
const ENTRY_DURATION = 0.22; // seconds
const ENTRY_STAGGER = 0.04;

/**
 * Radix Popover anchored at `anchor` (the hold-fired position) showing
 * a 3-5 slot arc of contextual `RadialOption`s. Per spec §5: framer-
 * motion spring entry, 5-slice arc.
 *
 * The arc spans 270° (top + sides) leaving a 90° gap at the bottom so
 * the player's thumb (which just fired the hold) doesn't sit on top of
 * the slot directly under it. Slot centers are evenly distributed
 * across the arc.
 */
export function RadialMenu({ anchor, surface, onPick, onClose, radius = 90 }: Props) {
	const opts = optionsFor(surface);
	const open = anchor !== null && opts.length > 0;
	const onPickRef = useRef(onPick);
	onPickRef.current = onPick;

	// Auto-close on Escape — Popover handles this via onOpenChange but we
	// must propagate closure to the parent so it clears `anchor`.
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!anchor) return null;

	return (
		<Popover.Root
			open={open}
			onOpenChange={(o) => {
				if (!o) onClose();
			}}
		>
			{/* Anchor is a 1×1 invisible div positioned at the gesture point.
			    Popover positions the content relative to it. */}
			<Popover.Anchor asChild>
				<div
					data-testid="radial-anchor"
					style={{
						position: 'fixed',
						left: anchor.x,
						top: anchor.y,
						width: 1,
						height: 1,
						pointerEvents: 'none',
					}}
				/>
			</Popover.Anchor>
			<Popover.Portal>
				<Popover.Content
					data-testid="radial-menu"
					side="top"
					sideOffset={0}
					align="center"
					avoidCollisions={false}
					style={{
						position: 'relative',
						width: 0,
						height: 0,
						pointerEvents: 'none',
					}}
				>
					<AnimatePresence>
						{open && (
							<motion.ul
								key={`radial-${surface}`}
								initial={{ opacity: 0, scale: 0.6 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								transition={{ duration: ENTRY_DURATION }}
								style={{
									listStyle: 'none',
									margin: 0,
									padding: 0,
									position: 'absolute',
									left: 0,
									top: 0,
									pointerEvents: 'auto',
								}}
							>
								{opts.map((opt, i) => {
									const angle = arcAngle(i, opts.length);
									const dx = Math.sin(angle) * radius;
									const dy = -Math.cos(angle) * radius;
									return (
										<motion.li
											key={opt.id}
											initial={{ opacity: 0, x: 0, y: 0 }}
											animate={{ opacity: 1, x: dx, y: dy }}
											exit={{ opacity: 0, x: 0, y: 0 }}
											transition={{
												duration: ENTRY_DURATION,
												delay: i * ENTRY_STAGGER,
												type: 'spring',
												stiffness: 300,
												damping: 22,
											}}
											style={{
												position: 'absolute',
												transform: 'translate(-50%, -50%)',
											}}
										>
											<button
												type="button"
												data-testid={`radial-option-${opt.id}`}
												onClick={() => {
													onPickRef.current(opt);
													onClose();
												}}
												style={{
													padding: '0.5rem',
													borderRadius: '50%',
													border: '2px solid var(--paper, #e8e6df)',
													background: 'var(--ink, #0d0f12)',
													color: 'var(--paper, #e8e6df)',
													fontFamily: 'var(--font-display), ui-monospace, monospace',
													letterSpacing: '0.06em',
													textTransform: 'uppercase',
													minWidth: '4.5rem',
													minHeight: '4.5rem',
													cursor: 'pointer',
													display: 'flex',
													flexDirection: 'column',
													alignItems: 'center',
													justifyContent: 'center',
													gap: '0.2rem',
													boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
												}}
											>
												<span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{opt.icon}</span>
												<span style={{ fontSize: '0.65rem', lineHeight: 1.1, textAlign: 'center' }}>
													{opt.label}
												</span>
											</button>
										</motion.li>
									);
								})}
							</motion.ul>
						)}
					</AnimatePresence>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}

/** Distribute `n` slots evenly across the ARC_DEGREES sweep, centered
 *  on top (12 o'clock = angle 0). Returns radians. */
function arcAngle(index: number, count: number): number {
	if (count === 1) return 0;
	const arcRad = (ARC_DEGREES * Math.PI) / 180;
	// Evenly distribute: index 0 at the leftmost arc edge, last index at
	// the rightmost edge. Center the sweep on 0 (straight up).
	const t = index / (count - 1); // 0 → 1
	return -arcRad / 2 + t * arcRad;
}
