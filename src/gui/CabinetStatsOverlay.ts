import { Control } from '@babylonjs/gui/2D/controls/control';
import type { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { QuartersStats } from '../game/quarters';
import { COLOR_MUTED, COLOR_PAPER, FONT_BODY, FONT_DISPLAY } from './brand';
import {
	LEDGER_FOOTER_HEIGHT,
	LEDGER_TITLE_HEIGHT,
	makeLedgerCloseButton,
	makeLedgerPanel,
	makeLedgerTitle,
} from './ledgerPanel';
import type { Overlay } from './Overlay';

const PANEL_WIDTH = 540;
const ROW_HEIGHT = 56;
const QUARTERS_GOLD = '#FFD55A';
const ROW_PADDING_X = 40;

interface StatSpec {
	readonly id: string;
	readonly label: string;
	readonly value: string;
	readonly color: string;
}

function buildStatRow(spec: StatSpec, rowTopPx: number): readonly TextBlock[] {
	const labelBlock = new TextBlock(`cabinet-stats-${spec.id}-label`);
	labelBlock.text = spec.label;
	labelBlock.color = COLOR_MUTED;
	labelBlock.fontSize = 18;
	labelBlock.fontFamily = FONT_BODY;
	labelBlock.height = `${ROW_HEIGHT}px`;
	labelBlock.width = `${PANEL_WIDTH - ROW_PADDING_X * 2}px`;
	labelBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
	labelBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
	labelBlock.paddingLeft = `${ROW_PADDING_X}px`;
	labelBlock.top = `${rowTopPx}px`;

	const valueBlock = new TextBlock(`cabinet-stats-${spec.id}-value`);
	valueBlock.text = spec.value;
	valueBlock.color = spec.color;
	valueBlock.fontSize = 28;
	valueBlock.fontFamily = FONT_DISPLAY;
	valueBlock.fontWeight = 'bold';
	valueBlock.height = `${ROW_HEIGHT}px`;
	valueBlock.width = `${PANEL_WIDTH - ROW_PADDING_X * 2}px`;
	valueBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
	valueBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
	valueBlock.paddingRight = `${ROW_PADDING_X}px`;
	valueBlock.top = `${rowTopPx}px`;

	return [labelBlock, valueBlock];
}

/**
 * Cabinet Stats overlay — reachable from the title screen. Renders the
 * persistent lifetime quarter ledger from `dord.economy` Preferences:
 * total quarters earned, total spent on continues, and number of friend
 * bailouts the player has accepted. Closes back to the title.
 */
export class CabinetStatsOverlay {
	private readonly panel: Rectangle;

	constructor(
		private readonly overlay: Overlay,
		stats: QuartersStats,
		onClose: () => void,
	) {
		const specs: readonly StatSpec[] = [
			{
				id: 'balance',
				label: 'CURRENT QUARTERS',
				value: String(stats.balance),
				color: QUARTERS_GOLD,
			},
			{
				id: 'earned',
				label: 'LIFETIME EARNED',
				value: String(stats.lifetimeEarned),
				color: COLOR_PAPER,
			},
			{
				id: 'spent',
				label: 'LIFETIME SPENT',
				value: String(stats.lifetimeSpent),
				color: COLOR_PAPER,
			},
			{
				id: 'bailouts',
				label: 'FRIENDLY BAILOUTS',
				value: String(stats.friendBailoutCount),
				color: COLOR_PAPER,
			},
		];
		const panelHeight = LEDGER_TITLE_HEIGHT + ROW_HEIGHT * specs.length + LEDGER_FOOTER_HEIGHT;

		this.panel = makeLedgerPanel('cabinet-stats', PANEL_WIDTH, panelHeight);
		overlay.add(this.panel);

		this.panel.addControl(makeLedgerTitle('cabinet-stats', 'CABINET STATS', PANEL_WIDTH));

		const blocks = specs.flatMap((spec, idx) =>
			buildStatRow(spec, LEDGER_TITLE_HEIGHT + ROW_HEIGHT * idx),
		);
		for (const block of blocks) this.panel.addControl(block);

		this.panel.addControl(makeLedgerCloseButton('cabinet-stats', onClose));
	}

	dispose(): void {
		this.overlay.remove(this.panel);
	}
}
