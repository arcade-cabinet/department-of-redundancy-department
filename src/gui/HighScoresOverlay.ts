import { Control } from '@babylonjs/gui/2D/controls/control';
import type { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { HIGH_SCORE_TABLE_SIZE, type HighScore } from '../preferences';
import { COLOR_PAPER, FONT_BODY, FONT_DISPLAY } from './brand';
import {
	LEDGER_FOOTER_HEIGHT,
	LEDGER_TITLE_HEIGHT,
	makeLedgerCloseButton,
	makeLedgerPanel,
	makeLedgerTitle,
} from './ledgerPanel';
import type { Overlay } from './Overlay';

const ROW_HEIGHT = 36;
const PANEL_WIDTH = 540;
const ROW_PADDING_X = 28;
const FOOTNOTE_HEIGHT = 28; // 20px text + 8px breathing room
// Minimum row-count reserved when the table is empty, so the panel is tall
// enough to legibly show the "NO SCORES YET" message + footnote + button.
const EMPTY_PANEL_ROWS = 4;
// Reserved space below the rows: footnote band + close-button band.
// Larger than LEDGER_FOOTER_HEIGHT (which only accounts for the button),
// so the footnote has a dedicated lane and never overlaps the last row.
const FOOTER_AREA_HEIGHT = FOOTNOTE_HEIGHT + LEDGER_FOOTER_HEIGHT;

// Per-column widths inside a row. Fixed lanes — not three blocks each
// claiming the full panel width — so a long score (10M+) can't overdraw
// into the right-aligned date column. Column origins are LEFT-edge of
// the row, with each block clipped to its own width.
const ROW_INNER_WIDTH = PANEL_WIDTH - 2 * ROW_PADDING_X;
const COL_RANK_WIDTH = 56;
const COL_DATE_WIDTH = 120;
const COL_SCORE_WIDTH = ROW_INNER_WIDTH - COL_RANK_WIDTH - COL_DATE_WIDTH;

const CLEARED_GOLD = '#FFD55A';
const RANK_COLORS = ['#FFD55A', '#D7D7D7', '#C68642'] as const; // gold, silver, bronze

interface RowSpec {
	readonly score: HighScore;
	readonly rankIdx: number;
	readonly rowTopPx: number;
}

/**
 * Build a row as three column-anchored TextBlocks (rank LEFT, score CENTER,
 * date RIGHT) so column alignment doesn't depend on space-padding in a
 * proportional font. FONT_DISPLAY is not monospace; padStart drift was the
 * previous failure mode (rank/score/date overlapping in the screenshot).
 */
function buildRow(spec: RowSpec): readonly TextBlock[] {
	const { score, rankIdx, rowTopPx } = spec;
	const color = rankIdx < 3 ? (RANK_COLORS[rankIdx] ?? COLOR_PAPER) : COLOR_PAPER;
	const weight = rankIdx < 3 ? 'bold' : 'normal';
	const fontSize = 20;

	const common = (block: TextBlock) => {
		block.color = color;
		block.fontSize = fontSize;
		block.fontFamily = FONT_DISPLAY;
		block.fontWeight = weight;
		block.height = `${ROW_HEIGHT}px`;
		block.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		block.top = `${rowTopPx}px`;
		// Each column owns a fixed lane; clip so a long score+star can't
		// bleed into the right-aligned date column.
		block.clipContent = true;
	};

	// Anchor each column relative to the panel's HORIZONTAL center via
	// `left`. PANEL_WIDTH is the full panel; we lay out columns from the
	// left edge using width + left offsets relative to row start.
	// Babylon GUI: HORIZONTAL_ALIGNMENT_LEFT + `left = Npx` puts the
	// block N pixels from the parent's LEFT edge.
	const rank = new TextBlock(`high-scores-row-${rankIdx}-rank`);
	rank.text = `${rankIdx + 1}.`;
	rank.width = `${COL_RANK_WIDTH}px`;
	rank.left = `${ROW_PADDING_X}px`;
	rank.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
	rank.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
	common(rank);

	const scoreLabel = new TextBlock(`high-scores-row-${rankIdx}-score`);
	const star = score.clearedRun ? ' ★' : '';
	scoreLabel.text = `${score.score.toLocaleString()}${star}`;
	scoreLabel.width = `${COL_SCORE_WIDTH}px`;
	scoreLabel.left = `${ROW_PADDING_X + COL_RANK_WIDTH}px`;
	scoreLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
	scoreLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
	common(scoreLabel);

	const date = new TextBlock(`high-scores-row-${rankIdx}-date`);
	date.text = score.utcDate;
	date.width = `${COL_DATE_WIDTH}px`;
	date.left = `-${ROW_PADDING_X}px`;
	date.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
	date.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
	common(date);

	return [rank, scoreLabel, date];
}

function buildEmptyLabel(): TextBlock {
	const label = new TextBlock('high-scores-empty');
	label.text = 'NO SCORES YET — INSERT A COIN';
	label.color = '#A0A0A0';
	label.fontSize = 18;
	label.fontFamily = FONT_BODY;
	label.height = `${ROW_HEIGHT}px`;
	label.width = `${PANEL_WIDTH - 40}px`;
	label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
	label.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
	label.top = '0px';
	return label;
}

function buildFootnote(): TextBlock {
	const f = new TextBlock('high-scores-footnote');
	f.text = '★ = run cleared (Reaper down)';
	f.color = CLEARED_GOLD;
	f.fontSize = 13;
	f.fontFamily = FONT_BODY;
	f.height = `${FOOTNOTE_HEIGHT}px`;
	f.width = `${PANEL_WIDTH - 40}px`;
	f.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
	// BOTTOM-anchored: sit immediately above the close-button band, with a
	// small extra gap so the gold underline doesn't kiss the BACK border.
	f.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
	f.top = `-${LEDGER_FOOTER_HEIGHT}px`;
	return f;
}

/**
 * High-scores top-N table reachable from the title-screen button. Reads
 * the persisted ledger via preferences.loadHighScores; renders score, run
 * date, and a ★ marker on cleared runs (vs. wiped). Closes back to title.
 *
 * All controls are added as children of the panel Rectangle, with TOP- or
 * BOTTOM-anchored vertical alignment so their pixel offsets are relative
 * to the panel edges (not canvas center).
 */
export class HighScoresOverlay {
	private readonly panel: Rectangle;

	constructor(
		private readonly overlay: Overlay,
		scores: readonly HighScore[],
		onClose: () => void,
	) {
		const visible = scores.slice(0, HIGH_SCORE_TABLE_SIZE);
		const bodyRows = visible.length === 0 ? EMPTY_PANEL_ROWS : visible.length;
		const panelHeight = LEDGER_TITLE_HEIGHT + ROW_HEIGHT * bodyRows + FOOTER_AREA_HEIGHT;

		this.panel = makeLedgerPanel('high-scores', PANEL_WIDTH, panelHeight);
		overlay.add(this.panel);

		this.panel.addControl(makeLedgerTitle('high-scores', 'HIGH SCORES', PANEL_WIDTH));

		if (visible.length === 0) {
			this.panel.addControl(buildEmptyLabel());
		} else {
			const blocks = visible.flatMap((score, i) =>
				buildRow({ score, rankIdx: i, rowTopPx: LEDGER_TITLE_HEIGHT + ROW_HEIGHT * i }),
			);
			for (const b of blocks) this.panel.addControl(b);
		}

		this.panel.addControl(buildFootnote());
		this.panel.addControl(makeLedgerCloseButton('high-scores', onClose));
	}

	dispose(): void {
		this.overlay.remove(this.panel);
	}
}
