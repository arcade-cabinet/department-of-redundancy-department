import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Slider } from '@babylonjs/gui/2D/controls/sliders/slider';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { Settings } from '../preferences';
import type { Overlay } from './Overlay';

/**
 * Settings overlay — volume sliders + haptics toggle. Read/write through
 * src/preferences.ts. No URL routing; this is a fullscreen overlay above the
 * paused game state.
 */
export class SettingsOverlay {
	private readonly panel: StackPanel;
	private readonly title: TextBlock;
	private readonly closeButton: Button;

	constructor(
		overlay: Overlay,
		initial: Settings,
		onChange: (next: Settings) => void,
		onClose: () => void,
	) {
		this.panel = new StackPanel('settings-panel');
		this.panel.width = '500px';
		this.panel.background = '#1F2228';
		this.panel.paddingTop = '32px';
		this.panel.paddingBottom = '32px';
		this.panel.paddingLeft = '32px';
		this.panel.paddingRight = '32px';
		overlay.add(this.panel);

		this.title = new TextBlock('settings-title', 'SETTINGS');
		this.title.color = '#FFFFFF';
		this.title.fontSize = 36;
		this.title.fontWeight = 'bold';
		this.title.height = '60px';
		this.title.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.panel.addControl(this.title);

		let state: Settings = { ...initial };

		this.addSlider(this.panel, 'Master Volume', state.masterVolume, (v) => {
			state = { ...state, masterVolume: v };
			onChange(state);
		});
		this.addSlider(this.panel, 'Music', state.musicVolume, (v) => {
			state = { ...state, musicVolume: v };
			onChange(state);
		});
		this.addSlider(this.panel, 'SFX', state.sfxVolume, (v) => {
			state = { ...state, sfxVolume: v };
			onChange(state);
		});

		this.closeButton = Button.CreateSimpleButton('settings-close', 'CLOSE');
		this.closeButton.width = '200px';
		this.closeButton.height = '60px';
		this.closeButton.color = '#FFFFFF';
		this.closeButton.background = '#15181C';
		this.closeButton.fontSize = 24;
		this.closeButton.thickness = 2;
		this.closeButton.cornerRadius = 6;
		this.closeButton.paddingTop = '16px';
		this.closeButton.onPointerUpObservable.add(() => onClose());
		this.panel.addControl(this.closeButton);
	}

	private addSlider(
		parent: StackPanel,
		label: string,
		initial: number,
		onChange: (value: number) => void,
	): void {
		const labelControl = new TextBlock(`settings-label-${label}`, label);
		labelControl.color = '#FFFFFF';
		labelControl.fontSize = 20;
		labelControl.height = '36px';
		labelControl.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		parent.addControl(labelControl);

		const slider = new Slider(`settings-slider-${label}`);
		slider.minimum = 0;
		slider.maximum = 1;
		slider.value = initial;
		slider.height = '32px';
		slider.color = '#3FFF7F';
		slider.background = '#404040';
		slider.onValueChangedObservable.add((v) => onChange(v));
		parent.addControl(slider);
	}

	dispose(overlay: Overlay): void {
		overlay.remove(this.panel);
	}
}
