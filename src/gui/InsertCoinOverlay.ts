import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { Overlay } from './Overlay';

/**
 * "INSERT COIN" overlay — the title screen, drawn over the Lobby's start
 * camera position. There is no separate title scene — the player literally
 * starts in the Lobby, frozen at t=0, with this overlay.
 *
 * Surfaces two secondary buttons below the primary INSERT COIN: HIGH
 * SCORES (routes to HighScoresOverlay) and CABINET STATS (routes to
 * CabinetStatsOverlay).
 */
export class InsertCoinOverlay {
	private readonly title: TextBlock;
	private readonly button: Button;
	private readonly highScoresButton: Button;
	private readonly cabinetStatsButton: Button;
	private readonly footnote: TextBlock;

	constructor(
		private readonly overlay: Overlay,
		onInsertCoin: () => void,
		onShowHighScores: () => void,
		onShowCabinetStats: () => void,
	) {
		this.title = new TextBlock('insert-coin-title');
		this.title.text = 'DEPARTMENT OF\nREDUNDANCY DEPARTMENT';
		this.title.color = '#FFFFFF';
		this.title.fontSize = 64;
		this.title.fontWeight = 'bold';
		this.title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.title.top = '-180px';
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
		this.button.top = '-20px';
		this.button.onPointerUpObservable.add(() => onInsertCoin());
		this.overlay.add(this.button);

		this.highScoresButton = Button.CreateSimpleButton('insert-coin-scores-btn', 'HIGH SCORES');
		this.highScoresButton.width = '240px';
		this.highScoresButton.height = '52px';
		this.highScoresButton.color = '#FFD55A';
		this.highScoresButton.background = '#15181C';
		this.highScoresButton.fontSize = 22;
		this.highScoresButton.fontWeight = 'bold';
		this.highScoresButton.thickness = 2;
		this.highScoresButton.cornerRadius = 6;
		this.highScoresButton.top = '80px';
		this.highScoresButton.onPointerUpObservable.add(() => onShowHighScores());
		this.overlay.add(this.highScoresButton);

		this.cabinetStatsButton = Button.CreateSimpleButton('insert-coin-stats-btn', 'CABINET STATS');
		this.cabinetStatsButton.width = '240px';
		this.cabinetStatsButton.height = '52px';
		this.cabinetStatsButton.color = '#A0A0A0';
		this.cabinetStatsButton.background = '#15181C';
		this.cabinetStatsButton.fontSize = 22;
		this.cabinetStatsButton.fontWeight = 'bold';
		this.cabinetStatsButton.thickness = 2;
		this.cabinetStatsButton.cornerRadius = 6;
		this.cabinetStatsButton.top = '144px';
		this.cabinetStatsButton.onPointerUpObservable.add(() => onShowCabinetStats());
		this.overlay.add(this.cabinetStatsButton);

		this.footnote = new TextBlock('insert-coin-footnote');
		this.footnote.text = 'TAP TO PLAY  ·  HEAD UP, AUDITOR';
		this.footnote.color = '#A0A0A0';
		this.footnote.fontSize = 18;
		this.footnote.top = '220px';
		this.overlay.add(this.footnote);
	}

	dispose(): void {
		this.overlay.remove(this.title);
		this.overlay.remove(this.button);
		this.overlay.remove(this.highScoresButton);
		this.overlay.remove(this.cabinetStatsButton);
		this.overlay.remove(this.footnote);
	}
}
