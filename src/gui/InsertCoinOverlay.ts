import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { Overlay } from './Overlay';

/**
 * "INSERT COIN" overlay — the title screen, drawn over the Lobby's start
 * camera position. There is no separate title scene — the player literally
 * starts in the Lobby, frozen at t=0, with this overlay.
 */
export class InsertCoinOverlay {
	private readonly title: TextBlock;
	private readonly button: Button;
	private readonly footnote: TextBlock;

	constructor(
		private readonly overlay: Overlay,
		onInsertCoin: () => void,
	) {
		this.title = new TextBlock('insert-coin-title');
		this.title.text = 'DEPARTMENT OF\nREDUNDANCY DEPARTMENT';
		this.title.color = '#FFFFFF';
		this.title.fontSize = 64;
		this.title.fontWeight = 'bold';
		this.title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.title.top = '-160px';
		this.title.outlineColor = '#000000';
		this.title.outlineWidth = 4;
		this.overlay.add(this.title);

		this.button = Button.CreateSimpleButton('insert-coin-btn', 'INSERT COIN');
		this.button.width = '320px';
		this.button.height = '80px';
		this.button.color = '#FFFFFF';
		this.button.background = '#15181C';
		this.button.fontSize = 32;
		this.button.fontWeight = 'bold';
		this.button.thickness = 3;
		this.button.cornerRadius = 8;
		this.button.onPointerUpObservable.add(() => onInsertCoin());
		this.overlay.add(this.button);

		this.footnote = new TextBlock('insert-coin-footnote');
		this.footnote.text = 'TAP TO PLAY  ·  HEAD UP, AUDITOR';
		this.footnote.color = '#A0A0A0';
		this.footnote.fontSize = 18;
		this.footnote.top = '120px';
		this.overlay.add(this.footnote);
	}

	dispose(): void {
		this.overlay.remove(this.title);
		this.overlay.remove(this.button);
		this.overlay.remove(this.footnote);
	}
}
