import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { QuartersStats } from '../game/quarters';
import { COLOR_MUTED, COLOR_PAPER, FONT_BODY, FONT_DISPLAY } from './brand';
import type { Overlay } from './Overlay';

const PANEL_WIDTH = 540;
const PANEL_HEIGHT = 360;
const ROW_HEIGHT = 56;
const QUARTERS_GOLD = '#FFD55A';

interface StatRow {
	readonly label: TextBlock;
	readonly value: TextBlock;
}

function buildStatRow(
	id: string,
	label: string,
	value: string,
	rowIdx: number,
	color: string,
): StatRow {
	const top = -(PANEL_HEIGHT / 2) + 96 + ROW_HEIGHT * rowIdx;
	const labelBlock = new TextBlock(`cabinet-stats-${id}-label`);
	labelBlock.text = label;
	labelBlock.color = COLOR_MUTED;
	labelBlock.fontSize = 18;
	labelBlock.fontFamily = FONT_BODY;
	labelBlock.height = `${ROW_HEIGHT}px`;
	labelBlock.width = `${PANEL_WIDTH - 80}px`;
	labelBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
	labelBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
	labelBlock.paddingLeft = '40px';
	labelBlock.top = `${top}px`;

	const valueBlock = new TextBlock(`cabinet-stats-${id}-value`);
	valueBlock.text = value;
	valueBlock.color = color;
	valueBlock.fontSize = 32;
	valueBlock.fontFamily = FONT_DISPLAY;
	valueBlock.fontWeight = 'bold';
	valueBlock.height = `${ROW_HEIGHT}px`;
	valueBlock.width = `${PANEL_WIDTH - 80}px`;
	valueBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
	valueBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
	valueBlock.paddingRight = '40px';
	valueBlock.top = `${top}px`;

	return { label: labelBlock, value: valueBlock };
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
	private readonly currentBalance: StatRow;
	private readonly lifetimeEarned: StatRow;
	private readonly lifetimeSpent: StatRow;
	private readonly friendBailouts: StatRow;
	private readonly closeButton: Button;

	constructor(
		private readonly overlay: Overlay,
		stats: QuartersStats,
		onClose: () => void,
	) {
		this.panel = this.makePanel();
		overlay.add(this.panel);

		this.title = this.makeTitle();
		overlay.add(this.title);

		this.currentBalance = buildStatRow(
			'balance',
			'CURRENT QUARTERS',
			String(stats.balance),
			0,
			QUARTERS_GOLD,
		);
		this.lifetimeEarned = buildStatRow(
			'earned',
			'LIFETIME EARNED',
			String(stats.lifetimeEarned),
			1,
			COLOR_PAPER,
		);
		this.lifetimeSpent = buildStatRow(
			'spent',
			'LIFETIME SPENT',
			String(stats.lifetimeSpent),
			2,
			COLOR_PAPER,
		);
		this.friendBailouts = buildStatRow(
			'bailouts',
			'FRIENDLY BAILOUTS',
			String(stats.friendBailoutCount),
			3,
			COLOR_PAPER,
		);

		for (const row of [
			this.currentBalance,
			this.lifetimeEarned,
			this.lifetimeSpent,
			this.friendBailouts,
		]) {
			overlay.add(row.label);
			overlay.add(row.value);
		}

		this.closeButton = this.makeCloseButton(onClose);
		overlay.add(this.closeButton);
	}

	private makePanel(): Rectangle {
		const r = new Rectangle('cabinet-stats-panel');
		r.width = `${PANEL_WIDTH}px`;
		r.height = `${PANEL_HEIGHT}px`;
		r.thickness = 2;
		r.color = COLOR_PAPER;
		r.background = 'rgba(21, 24, 28, 0.92)';
		r.cornerRadius = 8;
		return r;
	}

	private makeTitle(): TextBlock {
		const t = new TextBlock('cabinet-stats-title');
		t.text = 'CABINET STATS';
		t.color = COLOR_PAPER;
		t.fontSize = 36;
		t.fontFamily = FONT_DISPLAY;
		t.fontWeight = 'bold';
		t.height = '48px';
		t.width = `${PANEL_WIDTH - 40}px`;
		t.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		t.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		t.top = `${-(PANEL_HEIGHT / 2) + 24}px`;
		return t;
	}

	private makeCloseButton(onClose: () => void): Button {
		const b = Button.CreateSimpleButton('cabinet-stats-close', 'BACK');
		b.width = '180px';
		b.height = '44px';
		b.color = COLOR_PAPER;
		b.background = '#15181C';
		b.fontSize = 20;
		b.fontWeight = 'bold';
		b.thickness = 2;
		b.cornerRadius = 6;
		b.top = `${PANEL_HEIGHT / 2 - 22}px`;
		b.onPointerUpObservable.add(() => onClose());
		return b;
	}

	dispose(): void {
		this.overlay.remove(this.panel);
		this.overlay.remove(this.title);
		for (const row of [
			this.currentBalance,
			this.lifetimeEarned,
			this.lifetimeSpent,
			this.friendBailouts,
		]) {
			this.overlay.remove(row.label);
			this.overlay.remove(row.value);
		}
		this.overlay.remove(this.closeButton);
	}
}
