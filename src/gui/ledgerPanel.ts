import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { COLOR_PAPER, FONT_DISPLAY } from './brand';

/**
 * Shared factories for the title-screen ledger overlays — High Scores and
 * Cabinet Stats. Both render the same dark-paper rectangular panel with a
 * centered title at the top and a BACK button at the bottom; they only
 * differ in the body content. Extracting these here keeps both overlays
 * visually consistent and avoids a third copy when the next ledger lands.
 */

export function makeLedgerPanel(id: string, width: number, height: number): Rectangle {
	const r = new Rectangle(`${id}-panel`);
	r.width = `${width}px`;
	r.height = `${height}px`;
	r.thickness = 2;
	r.color = COLOR_PAPER;
	r.background = 'rgba(21, 24, 28, 0.92)';
	r.cornerRadius = 8;
	return r;
}

export function makeLedgerTitle(
	id: string,
	text: string,
	panelWidth: number,
	panelHeight: number,
): TextBlock {
	const t = new TextBlock(`${id}-title`);
	t.text = text;
	t.color = COLOR_PAPER;
	t.fontSize = 36;
	t.fontFamily = FONT_DISPLAY;
	t.fontWeight = 'bold';
	t.height = '48px';
	t.width = `${panelWidth - 40}px`;
	t.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
	t.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
	t.top = `${-(panelHeight / 2) + 24}px`;
	return t;
}

export function makeLedgerCloseButton(
	id: string,
	panelHeight: number,
	onClose: () => void,
): Button {
	const b = Button.CreateSimpleButton(`${id}-close`, 'BACK');
	b.width = '180px';
	b.height = '44px';
	b.color = COLOR_PAPER;
	b.background = '#15181C';
	b.fontSize = 20;
	b.fontWeight = 'bold';
	b.thickness = 2;
	b.cornerRadius = 6;
	b.top = `${panelHeight / 2 - 22}px`;
	b.onPointerUpObservable.add(() => onClose());
	return b;
}
