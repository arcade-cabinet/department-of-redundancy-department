import { Control } from '@babylonjs/gui/2D/controls/control';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { COLOR_PAPER, FONT_DISPLAY } from './brand';
import type { Overlay } from './Overlay';

/**
 * Center-screen title-card layer for the `narrator` cue. The encounter director
 * fires `narrator` cues at floor reveals, tutorial moments, and boss intros
 * (e.g. "HUMAN RESOURCES — FLOOR 19", "PAINTINGS HAVE TEETH", "THE REAPER").
 *
 * One-shot rendering: `show(text, durationMs)` swaps the visible label and
 * schedules a hide. Calling `show` again replaces the in-flight card. The
 * overlay does not queue multiple cards — by design the director never fires
 * overlapping narrator cues within a level.
 */
export class NarratorOverlay {
	private readonly card: TextBlock;
	private hideHandle: number | null = null;

	constructor(private readonly overlay: Overlay) {
		this.card = new TextBlock('narrator-card', '');
		this.card.color = COLOR_PAPER;
		this.card.fontSize = 56;
		this.card.fontFamily = FONT_DISPLAY;
		this.card.fontWeight = 'bold';
		this.card.height = '120px';
		this.card.width = '90%';
		this.card.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.card.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		this.card.shadowColor = 'rgba(0, 0, 0, 0.95)';
		this.card.shadowBlur = 0;
		this.card.shadowOffsetX = 2;
		this.card.shadowOffsetY = 2;
		this.card.alpha = 0;
		overlay.add(this.card);
	}

	show(text: string, durationMs: number): void {
		if (this.hideHandle !== null) {
			window.clearTimeout(this.hideHandle);
			this.hideHandle = null;
		}
		this.card.text = text;
		this.card.alpha = 1;
		this.hideHandle = window.setTimeout(() => {
			this.card.alpha = 0;
			this.hideHandle = null;
		}, durationMs);
	}

	dispose(): void {
		if (this.hideHandle !== null) {
			window.clearTimeout(this.hideHandle);
			this.hideHandle = null;
		}
		this.overlay.remove(this.card);
	}
}
