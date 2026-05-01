import type { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import type { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { HIGH_SCORE_TABLE_SIZE, type HighScore } from '../preferences';
import { COLOR_PAPER, FONT_BODY, FONT_DISPLAY } from './brand';
import { makeLedgerCloseButton, makeLedgerPanel, makeLedgerTitle } from './ledgerPanel';
import type { Overlay } from './Overlay';

const ROW_HEIGHT = 32;
const PANEL_WIDTH = 540;
const PANEL_HEADER_HEIGHT = 80;
const PANEL_FOOTER_HEIGHT = 84;

const CLEARED_GOLD = '#FFD55A';
const RANK_COLORS = ['#FFD55A', '#D7D7D7', '#C68642'] as const; // gold, silver, bronze

function buildRow(score: HighScore, rankIdx: number, panelHeight: number): TextBlock {
	const row = new TextBlock(`high-scores-row-${rankIdx}`);
	const rank = rankIdx + 1;
	const rankPad = String(rank).padStart(2, ' ');
	const clearedMark = score.clearedRun ? ' ★' : '  ';
	const scoreText = score.score.toLocaleString().padStart(10, ' ');
	row.text = `${rankPad}.  ${scoreText}${clearedMark}   ${score.utcDate}`;
	row.color = rankIdx < 3 ? (RANK_COLORS[rankIdx] ?? COLOR_PAPER) : COLOR_PAPER;
	row.fontSize = 22;
	row.fontFamily = FONT_DISPLAY;
	row.fontWeight = rankIdx < 3 ? 'bold' : 'normal';
	row.height = `${ROW_HEIGHT}px`;
	row.width = `${PANEL_WIDTH - 40}px`;
	row.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
	row.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
	row.paddingLeft = '40px';
	row.top = `${-(panelHeight / 2) + PANEL_HEADER_HEIGHT + ROW_HEIGHT * rankIdx}px`;
	return row;
}

function buildEmptyLabel(panelHeight: number): TextBlock {
	const label = new TextBlock('high-scores-empty');
	label.text = 'NO SCORES YET — INSERT A COIN';
	label.color = '#A0A0A0';
	label.fontSize = 22;
	label.fontFamily = FONT_BODY;
	label.height = `${ROW_HEIGHT}px`;
	label.width = `${PANEL_WIDTH - 40}px`;
	label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
	label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
	label.top = `${-(panelHeight / 2) + PANEL_HEADER_HEIGHT}px`;
	return label;
}

/**
 * High-scores top-N table reachable from the title-screen button. Reads
 * the persisted ledger via preferences.loadHighScores; renders score, run
 * date, and a ★ marker on cleared runs (vs. wiped). Closes back to title.
 */
export class HighScoresOverlay {
	private readonly panel: Rectangle;
	private readonly title: TextBlock;
	private readonly emptyLabel: TextBlock | null;
	private readonly rows: readonly Control[];
	private readonly closeButton: Button;
	private readonly footnote: TextBlock;

	constructor(
		private readonly overlay: Overlay,
		scores: readonly HighScore[],
		onClose: () => void,
	) {
		const visible = scores.slice(0, HIGH_SCORE_TABLE_SIZE);
		const panelHeight =
			PANEL_HEADER_HEIGHT + ROW_HEIGHT * Math.max(visible.length, 1) + PANEL_FOOTER_HEIGHT;

		this.panel = makeLedgerPanel('high-scores', PANEL_WIDTH, panelHeight);
		overlay.add(this.panel);

		this.title = makeLedgerTitle('high-scores', 'HIGH SCORES', PANEL_WIDTH, panelHeight);
		overlay.add(this.title);

		if (visible.length === 0) {
			this.emptyLabel = buildEmptyLabel(panelHeight);
			this.rows = [];
			overlay.add(this.emptyLabel);
		} else {
			this.emptyLabel = null;
			const rows = visible.map((s, i) => {
				const row = buildRow(s, i, panelHeight);
				overlay.add(row);
				return row;
			});
			this.rows = rows;
		}

		this.footnote = this.makeFootnote(panelHeight);
		overlay.add(this.footnote);

		this.closeButton = makeLedgerCloseButton('high-scores', panelHeight, onClose);
		overlay.add(this.closeButton);
	}

	private makeFootnote(panelHeight: number): TextBlock {
		const f = new TextBlock('high-scores-footnote');
		f.text = '★ = run cleared (Reaper down)';
		f.color = CLEARED_GOLD;
		f.fontSize = 14;
		f.fontFamily = FONT_BODY;
		f.height = '20px';
		f.width = `${PANEL_WIDTH - 40}px`;
		f.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		f.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		f.top = `${panelHeight / 2 - 56}px`;
		return f;
	}

	dispose(): void {
		this.overlay.remove(this.panel);
		this.overlay.remove(this.title);
		if (this.emptyLabel) this.overlay.remove(this.emptyLabel);
		for (const row of this.rows) this.overlay.remove(row);
		this.overlay.remove(this.footnote);
		this.overlay.remove(this.closeButton);
	}
}
