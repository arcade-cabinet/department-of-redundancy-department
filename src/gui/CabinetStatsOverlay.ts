import type { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import type { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { QuartersStats } from '../game/quarters';
import { COLOR_MUTED, COLOR_PAPER, FONT_BODY, FONT_DISPLAY } from './brand';
import { makeLedgerCloseButton, makeLedgerPanel, makeLedgerTitle } from './ledgerPanel';
import type { Overlay } from './Overlay';

const PANEL_WIDTH = 540;
const PANEL_HEIGHT = 360;
const ROW_HEIGHT = 56;
const QUARTERS_GOLD = '#FFD55A';

interface StatSpec {
	readonly id: string;
	readonly label: string;
	readonly value: string;
	readonly color: string;
}

function buildStatRow(spec: StatSpec, rowIdx: number): readonly TextBlock[] {
	const top = -(PANEL_HEIGHT / 2) + 96 + ROW_HEIGHT * rowIdx;
	const labelBlock = new TextBlock(`cabinet-stats-${spec.id}-label`);
	labelBlock.text = spec.label;
	labelBlock.color = COLOR_MUTED;
	labelBlock.fontSize = 18;
	labelBlock.fontFamily = FONT_BODY;
	labelBlock.height = `${ROW_HEIGHT}px`;
	labelBlock.width = `${PANEL_WIDTH - 80}px`;
	labelBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
	labelBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
	labelBlock.paddingLeft = '40px';
	labelBlock.top = `${top}px`;

	const valueBlock = new TextBlock(`cabinet-stats-${spec.id}-value`);
	valueBlock.text = spec.value;
	valueBlock.color = spec.color;
	valueBlock.fontSize = 32;
	valueBlock.fontFamily = FONT_DISPLAY;
	valueBlock.fontWeight = 'bold';
	valueBlock.height = `${ROW_HEIGHT}px`;
	valueBlock.width = `${PANEL_WIDTH - 80}px`;
	valueBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
	valueBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
	valueBlock.paddingRight = '40px';
	valueBlock.top = `${top}px`;

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
	private readonly title: TextBlock;
	private readonly statBlocks: readonly TextBlock[];
	private readonly closeButton: Button;

	constructor(
		private readonly overlay: Overlay,
		stats: QuartersStats,
		onClose: () => void,
	) {
		this.panel = makeLedgerPanel('cabinet-stats', PANEL_WIDTH, PANEL_HEIGHT);
		overlay.add(this.panel);

		this.title = makeLedgerTitle('cabinet-stats', 'CABINET STATS', PANEL_WIDTH, PANEL_HEIGHT);
		overlay.add(this.title);

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
		const blocks = specs.flatMap((spec, idx) => buildStatRow(spec, idx));
		for (const block of blocks) overlay.add(block);
		this.statBlocks = blocks;

		this.closeButton = makeLedgerCloseButton('cabinet-stats', PANEL_HEIGHT, onClose);
		overlay.add(this.closeButton);
	}

	dispose(): void {
		this.overlay.remove(this.panel);
		this.overlay.remove(this.title);
		for (const block of this.statBlocks) this.overlay.remove(block);
		this.overlay.remove(this.closeButton);
	}
}
