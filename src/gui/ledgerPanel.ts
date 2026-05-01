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
 *
 * All sub-controls are intended to be added as CHILDREN of the panel via
 * `panel.addControl(...)`. Coordinates are panel-relative:
 *   - `verticalAlignment = TOP` + `top: Npx` → N pixels from the top edge.
 *   - `verticalAlignment = BOTTOM` + `top: -Npx` → N pixels from the bottom.
 * Adding any of these to the root overlay places them at canvas-center
 * coordinates and breaks layout.
 */

export const LEDGER_TITLE_HEIGHT = 64;
export const LEDGER_FOOTER_HEIGHT = 64;

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

export function makeLedgerTitle(id: string, text: string, panelWidth: number): TextBlock {
	const t = new TextBlock(`${id}-title`);
	t.text = text;
	t.color = COLOR_PAPER;
	t.fontSize = 28;
	t.fontFamily = FONT_DISPLAY;
	t.fontWeight = 'bold';
	t.height = `${LEDGER_TITLE_HEIGHT}px`;
	t.width = `${panelWidth - 40}px`;
	t.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
	t.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
	t.top = '8px';
	return t;
}

export function makeLedgerCloseButton(id: string, onClose: () => void): Button {
	const b = Button.CreateSimpleButton(`${id}-close`, 'BACK');
	b.width = '180px';
	b.height = '44px';
	b.color = COLOR_PAPER;
	b.background = '#15181C';
	b.fontSize = 20;
	b.fontWeight = 'bold';
	b.thickness = 2;
	b.cornerRadius = 6;
	b.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
	b.top = '-12px';
	b.onPointerUpObservable.add(onClose);
	return b;
}
