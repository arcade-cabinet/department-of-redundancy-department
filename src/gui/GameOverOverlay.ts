import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { Overlay } from './Overlay';

export interface GameOverSummary {
	readonly score: number;
	readonly newHighScore: boolean;
	readonly enemiesKilled: number;
	readonly headshots: number;
	readonly justiceShots: number;
	readonly civilianHits: number;
	readonly elapsedMs: number;
	readonly clearedRun: boolean;
}

export class GameOverOverlay {
	private readonly title: TextBlock;
	private readonly summary: TextBlock;
	private readonly button: Button;

	constructor(overlay: Overlay, summary: GameOverSummary, onAnotherCoin: () => void) {
		this.title = new TextBlock('game-over-title');
		this.title.text = summary.clearedRun ? 'YOU GOT OUT' : 'GAME OVER';
		this.title.color = summary.clearedRun ? '#FFD040' : '#FF4040';
		this.title.fontSize = 96;
		this.title.fontWeight = 'bold';
		this.title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.title.top = '-200px';
		this.title.outlineColor = '#000000';
		this.title.outlineWidth = 6;
		overlay.add(this.title);

		const seconds = Math.round(summary.elapsedMs / 1000);
		const accuracy =
			summary.enemiesKilled > 0 ? Math.round((summary.headshots / summary.enemiesKilled) * 100) : 0;
		this.summary = new TextBlock('game-over-summary');
		this.summary.text = [
			`SCORE: ${summary.score.toLocaleString()}${summary.newHighScore ? '  ★ NEW HIGH' : ''}`,
			`KILLS: ${summary.enemiesKilled}  ·  HEADSHOTS: ${summary.headshots} (${accuracy}%)`,
			`JUSTICE: ${summary.justiceShots}  ·  CIVILIAN HITS: ${summary.civilianHits}`,
			`TIME: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
		].join('\n');
		this.summary.color = '#FFFFFF';
		this.summary.fontSize = 24;
		this.summary.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.summary.top = '-20px';
		this.summary.outlineColor = '#000000';
		this.summary.outlineWidth = 2;
		overlay.add(this.summary);

		this.button = Button.CreateSimpleButton('game-over-btn', 'ANOTHER COIN');
		this.button.width = '320px';
		this.button.height = '80px';
		this.button.color = '#FFFFFF';
		this.button.background = '#15181C';
		this.button.fontSize = 32;
		this.button.thickness = 3;
		this.button.cornerRadius = 8;
		this.button.top = '180px';
		this.button.onPointerUpObservable.add(() => onAnotherCoin());
		overlay.add(this.button);
	}

	dispose(overlay: Overlay): void {
		overlay.remove(this.title);
		overlay.remove(this.summary);
		overlay.remove(this.button);
	}
}
