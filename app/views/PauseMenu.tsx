import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import * as prefs from '@/db/preferences';

type Props = {
	open: boolean;
	onResume: () => void;
	onQuit: () => void;
};

/**
 * Pause overlay (PRQ-05 T8 stub). Radix Dialog with Resume / Settings
 * (volume + look-sensitivity sliders writing to @capacitor/preferences) /
 * Quit-to-Landing. Polish + visual treatment lands in PRQ-14.
 *
 * The host (Game.tsx) decides when to open it (ESC keystroke from
 * desktopFallback, or a top-right pause button on mobile in PRQ-14).
 * On open, koota's tick is paused upstream — this view doesn't manage
 * that itself.
 */
export function PauseMenu({ open, onResume, onQuit }: Props) {
	const [vMaster, setVMaster] = useState<number | null>(null);
	const [vSfx, setVSfx] = useState<number | null>(null);
	const [vMusic, setVMusic] = useState<number | null>(null);
	const [look, setLook] = useState<number | null>(null);

	// Lazy-load on first open so we don't hit @capacitor/preferences before
	// the rest of the boot completes.
	useEffect(() => {
		if (!open) return;
		void Promise.all([
			prefs.get('volume_master'),
			prefs.get('volume_sfx'),
			prefs.get('volume_music'),
			prefs.get('look_sensitivity'),
		]).then(([a, b, c, d]) => {
			setVMaster(a);
			setVSfx(b);
			setVMusic(c);
			setLook(d);
		});
	}, [open]);

	const sliderHandler =
		<K extends 'volume_master' | 'volume_sfx' | 'volume_music' | 'look_sensitivity'>(
			key: K,
			setter: (v: number) => void,
		) =>
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const v = Number(e.target.value);
			setter(v);
			void prefs.set(key, v);
		};

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && onResume()}>
			<Dialog.Portal>
				<Dialog.Overlay
					data-testid="pause-overlay"
					style={{
						position: 'fixed',
						inset: 0,
						background: 'rgba(13, 15, 18, 0.7)',
						zIndex: 1000,
					}}
				/>
				<Dialog.Content
					data-testid="pause-menu"
					style={{
						position: 'fixed',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						minWidth: '20rem',
						maxWidth: '90vw',
						padding: '1.5rem',
						background: 'var(--ink, #0d0f12)',
						color: 'var(--paper, #e8e6df)',
						border: '1px solid var(--paper, #e8e6df)',
						font: '14px ui-monospace, monospace',
						zIndex: 1001,
					}}
				>
					<Dialog.Title style={{ margin: 0, marginBottom: '1rem' }}>PAUSED</Dialog.Title>

					<section style={{ marginBottom: '1rem' }}>
						<h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', opacity: 0.8 }}>Settings</h3>
						<Slider
							label="Master volume"
							value={vMaster}
							onChange={sliderHandler('volume_master', setVMaster)}
							testId="vol-master"
						/>
						<Slider
							label="SFX volume"
							value={vSfx}
							onChange={sliderHandler('volume_sfx', setVSfx)}
							testId="vol-sfx"
						/>
						<Slider
							label="Music volume"
							value={vMusic}
							onChange={sliderHandler('volume_music', setVMusic)}
							testId="vol-music"
						/>
						<Slider
							label="Look sensitivity"
							value={look}
							onChange={sliderHandler('look_sensitivity', setLook)}
							min={0.1}
							max={3}
							step={0.05}
							testId="look-sens"
						/>
					</section>

					<div style={{ display: 'flex', gap: '0.5rem' }}>
						<button type="button" data-testid="pause-resume" onClick={onResume} style={btnStyle}>
							RESUME
						</button>
						<button type="button" data-testid="pause-quit" onClick={onQuit} style={btnStyle}>
							QUIT TO LANDING
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

const btnStyle: React.CSSProperties = {
	flex: 1,
	padding: '0.5rem 1rem',
	background: 'transparent',
	color: 'inherit',
	border: '1px solid currentColor',
	font: 'inherit',
	cursor: 'pointer',
};

function Slider({
	label,
	value,
	onChange,
	min = 0,
	max = 1,
	step = 0.05,
	testId,
}: {
	label: string;
	value: number | null;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	min?: number;
	max?: number;
	step?: number;
	testId: string;
}) {
	const id = `pause-slider-${testId}`;
	return (
		<div style={{ marginBottom: '0.5rem' }}>
			<label
				htmlFor={id}
				style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}
			>
				<span>{label}</span>
				<span>{value !== null ? value.toFixed(2) : '—'}</span>
			</label>
			<input
				id={id}
				type="range"
				data-testid={id}
				min={min}
				max={max}
				step={step}
				value={value ?? 0}
				onChange={onChange}
				style={{ width: '100%' }}
			/>
		</div>
	);
}
