import { useEffect, useState } from 'react';
import { globalAudio } from '@/audio/GlobalAudio';
import * as prefs from '@/db/preferences';
import { exportSaveBlob, importSaveBlob, type SaveBlob } from '@/db/saveBlob';
import { t } from '@/i18n/locale';
import { Button, Dialog, Slider, Tabs } from '@/ui/primitives';

type Props = {
	open: boolean;
	onResume: () => void;
	onQuit: () => void;
	/** Live in-game stats for the Stats tab. Optional so the host can
	 *  defer wiring while the rest of the UI lands. */
	stats?: {
		floor: number;
		threat: number;
		kills: number;
		playedSeconds: number;
	};
	/** Tracery memos collected during this run (PRQ-B5). */
	memos?: readonly string[];
	/** Snapshot factory for the save-export button (PRQ-RC2). */
	getSaveBlob?: () => SaveBlob;
	/** Apply an imported save blob (PRQ-RC2). */
	onImportSave?: (blob: SaveBlob) => void;
};

/**
 * PauseMenu (PRQ-14 T5, M2c6). Three tabs:
 *
 *   - Stats: live floor / threat / kill count / played time. Mirrors
 *     the EmployeeFile view but for the active run.
 *   - Settings: master + SFX + music volume sliders + look sensitivity
 *     slider, all writing to @capacitor/preferences in real time.
 *   - Journal: collected memos. Alpha = empty list (PRQ-B5 Tracery
 *     wires the actual entries).
 *
 * The host (Game.tsx) decides when to open it; on open the Physics
 * world is paused upstream (PauseProvider).
 */
export function PauseMenu({
	open,
	onResume,
	onQuit,
	stats,
	memos,
	getSaveBlob,
	onImportSave,
}: Props) {
	const [vMaster, setVMaster] = useState<number | null>(null);
	const [vSfx, setVSfx] = useState<number | null>(null);
	const [vMusic, setVMusic] = useState<number | null>(null);
	const [look, setLook] = useState<number | null>(null);
	const [importErr, setImportErr] = useState<string | null>(null);

	const onExport = () => {
		if (!getSaveBlob) return;
		const json = exportSaveBlob(getSaveBlob());
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `dord-save-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};
	const onImport = () => {
		if (!onImportSave) return;
		const inp = document.createElement('input');
		inp.type = 'file';
		inp.accept = 'application/json';
		inp.onchange = () => {
			const file = inp.files?.[0];
			if (!file) return;
			file.text().then((text) => {
				const parsed = importSaveBlob(text);
				if (!parsed) {
					setImportErr('Save file invalid or corrupt.');
					return;
				}
				setImportErr(null);
				onImportSave(parsed);
			});
		};
		inp.click();
	};

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
			// PRQ-15 M2c7: master volume drives the GlobalAudio listener
			// gain in real time so the player hears the slider immediately.
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

					<Tabs.Root defaultValue="settings">
						<Tabs.List>
							<Tabs.Trigger value="stats" data-testid="pause-tab-stats">
								{t('pause.tab.stats')}
							</Tabs.Trigger>
							<Tabs.Trigger value="settings" data-testid="pause-tab-settings">
								{t('pause.tab.settings')}
							</Tabs.Trigger>
							<Tabs.Trigger value="journal" data-testid="pause-tab-journal">
								{t('pause.tab.journal')}
							</Tabs.Trigger>
						</Tabs.List>

						<Tabs.Content value="stats">
							{stats ? (
								<dl style={statsGrid}>
									<dt style={statKey}>FLOOR</dt>
									<dd style={statVal}>{stats.floor}</dd>
									<dt style={statKey}>THREAT</dt>
									<dd style={statVal}>{stats.threat.toFixed(1)}</dd>
									<dt style={statKey}>KILLS</dt>
									<dd style={statVal}>{stats.kills}</dd>
									<dt style={statKey}>PLAYED</dt>
									<dd style={statVal}>{formatTime(stats.playedSeconds)}</dd>
								</dl>
							) : (
								<p style={{ opacity: 0.6 }}>No stats yet.</p>
							)}
						</Tabs.Content>

						<Tabs.Content value="settings">
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
							{(getSaveBlob || onImportSave) && (
								<div
									style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}
								>
									{getSaveBlob && (
										<Button data-testid="pause-export-save" variant="ghost" onClick={onExport}>
											EXPORT SAVE
										</Button>
									)}
									{onImportSave && (
										<Button data-testid="pause-import-save" variant="ghost" onClick={onImport}>
											IMPORT SAVE
										</Button>
									)}
								</div>
							)}
							{importErr && (
								<p
									data-testid="pause-import-err"
									style={{ color: 'var(--alarm)', fontSize: '0.85rem' }}
								>
									{importErr}
								</p>
							)}
						</Tabs.Content>

						<Tabs.Content value="journal">
							{memos && memos.length > 0 ? (
								<ul
									data-testid="pause-memos"
									style={{
										listStyle: 'none',
										padding: 0,
										margin: 0,
										maxHeight: 240,
										overflowY: 'auto',
									}}
								>
									{memos.map((m) => (
										<li
											key={m}
											style={{
												padding: 'var(--space-2)',
												marginBottom: 'var(--space-2)',
												background: 'var(--ink-2, rgba(255,255,255,0.04))',
												borderLeft: '2px solid var(--paper)',
												fontSize: '0.85rem',
												lineHeight: 1.4,
											}}
										>
											{m}
										</li>
									))}
								</ul>
							) : (
								<p style={{ opacity: 0.6 }}>No memos collected yet.</p>
							)}
						</Tabs.Content>
					</Tabs.Root>

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

const statsGrid: React.CSSProperties = {
	display: 'grid',
	gridTemplateColumns: 'auto auto',
	gap: 'var(--space-2) var(--space-5)',
	margin: 0,
	fontFamily: 'var(--font-mono)',
	fontSize: '0.9rem',
};

const statKey: React.CSSProperties = { opacity: 0.6 };
const statVal: React.CSSProperties = { margin: 0, textAlign: 'right' };

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}
