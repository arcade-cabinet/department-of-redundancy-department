import { useEffect, useState } from 'react';
import { globalAudio } from '@/audio/GlobalAudio';
import * as prefs from '@/db/preferences';
import { t } from '@/i18n/locale';
import { Button, Dialog, Slider } from '@/ui/primitives';

type Props = {
	open: boolean;
	onResume: () => void;
	onQuit: () => void;
};

/**
 * PauseMenu — simplified for PRQ-1.0 rail-shooter foundation.
 *
 * Removed: journal tab, export-save, import-save, weapon-workbench,
 * stats tab, memos, getSaveBlob, onImportSave props.
 * Kept: settings volume sliders + look sensitivity, resume, quit.
 */
export function PauseMenu({ open, onResume, onQuit }: Props) {
	const [vMaster, setVMaster] = useState<number | null>(null);
	const [vSfx, setVSfx] = useState<number | null>(null);
	const [vMusic, setVMusic] = useState<number | null>(null);
	const [look, setLook] = useState<number | null>(null);

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

	const writePref =
		<K extends 'volume_master' | 'volume_sfx' | 'volume_music' | 'look_sensitivity'>(
			key: K,
			setter: (v: number) => void,
		) =>
		(vals: number[]) => {
			const v = vals[0] ?? 0;
			setter(v);
			void prefs.set(key, v);
			if (key === 'volume_master') globalAudio.setMaster(v);
		};

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && onResume()}>
			<Dialog.Portal>
				<Dialog.Overlay data-testid="pause-overlay" />
				<Dialog.Content data-testid="pause-menu" aria-describedby="pause-desc">
					<Dialog.Title>{t('pause.title')}</Dialog.Title>
					<Dialog.Description
						id="pause-desc"
						style={{
							position: 'absolute',
							width: 1,
							height: 1,
							overflow: 'hidden',
							clip: 'rect(0 0 0 0)',
						}}
					>
						Game paused. Resume to continue, or quit to return to the landing page.
					</Dialog.Description>

					<SliderRow
						label="Master volume"
						value={vMaster}
						onValueChange={writePref('volume_master', setVMaster)}
						testId="vol-master"
					/>
					<SliderRow
						label="SFX volume"
						value={vSfx}
						onValueChange={writePref('volume_sfx', setVSfx)}
						testId="vol-sfx"
					/>
					<SliderRow
						label="Music volume"
						value={vMusic}
						onValueChange={writePref('volume_music', setVMusic)}
						testId="vol-music"
					/>
					<SliderRow
						label="Look sensitivity"
						value={look}
						onValueChange={writePref('look_sensitivity', setLook)}
						min={0.1}
						max={3}
						step={0.05}
						testId="look-sens"
					/>

					<div
						style={{
							display: 'flex',
							gap: 'var(--space-3)',
							marginTop: 'var(--space-5)',
						}}
					>
						<Button data-testid="pause-resume" variant="auditor" onClick={onResume}>
							{t('pause.button.resume')}
						</Button>
						<Button data-testid="pause-quit" variant="ghost" onClick={onQuit}>
							{t('pause.button.quit')}
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

interface SliderRowProps {
	label: string;
	value: number | null;
	onValueChange: (vals: number[]) => void;
	min?: number;
	max?: number;
	step?: number;
	testId: string;
}

function SliderRow({
	label,
	value,
	onValueChange,
	min = 0,
	max = 1,
	step = 0.05,
	testId,
}: SliderRowProps) {
	return (
		<div style={{ marginBottom: 'var(--space-3)' }} data-testid={`pause-slider-${testId}`}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					fontSize: '0.85rem',
					marginBottom: 'var(--space-1)',
				}}
			>
				<span>{label}</span>
				<span style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
					{value !== null ? value.toFixed(2) : '—'}
				</span>
			</div>
			<Slider
				value={value !== null ? [value] : [0]}
				min={min}
				max={max}
				step={step}
				onValueChange={onValueChange}
			/>
		</div>
	);
}
