import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { now } from '../engine/clock';
import type { Overlay } from './Overlay';

const COUNTDOWN_MS = 10000;

/**
 * "CONTINUE?" overlay — appears after the player loses their third life.
 * 10-second countdown; on timeout → game-over.
 *
 * Shown only when the persistent quarter balance is > 0 (caller's
 * responsibility to gate). Continue consumes 1 quarter per
 * docs/spec/06-economy.md.
 */
export class ContinueOverlay {
	private readonly title: TextBlock;
	private readonly countdown: TextBlock;
	private readonly quartersLabel: TextBlock;
	private readonly button: Button;
	private readonly skipButton: Button;
	private remainingMs = COUNTDOWN_MS;
	private startedAt = 0;
	private rafHandle = 0;

	private readonly onTimeout: () => void;

	constructor(
		private readonly overlay: Overlay,
		quartersAvailable: number,
		onContinue: () => void,
		onTimeout: () => void,
	) {
		this.onTimeout = onTimeout;
		this.title = new TextBlock('continue-title');
		this.title.text = 'CONTINUE?';
		this.title.color = '#FF4040';
		this.title.fontSize = 96;
		this.title.fontWeight = 'bold';
		this.title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.title.top = '-200px';
		this.title.outlineColor = '#000000';
		this.title.outlineWidth = 6;
		this.overlay.add(this.title);

		this.quartersLabel = new TextBlock('continue-quarters');
		this.quartersLabel.text = `QUARTERS  ${quartersAvailable}`;
		this.quartersLabel.color = '#FFD55A';
		this.quartersLabel.fontSize = 28;
		this.quartersLabel.fontWeight = 'bold';
		this.quartersLabel.top = '-100px';
		this.overlay.add(this.quartersLabel);

		this.countdown = new TextBlock('continue-countdown');
		this.countdown.text = '10';
		this.countdown.color = '#FFFFFF';
		this.countdown.fontSize = 80;
		this.countdown.top = '-40px';
		this.overlay.add(this.countdown);

		this.button = Button.CreateSimpleButton('continue-btn', 'INSERT ANOTHER COIN');
		this.button.width = '360px';
		this.button.height = '80px';
		this.button.color = '#FFFFFF';
		this.button.background = '#15181C';
		this.button.fontSize = 28;
		this.button.fontWeight = 'bold';
		this.button.thickness = 3;
		this.button.cornerRadius = 8;
		this.button.top = '80px';
		this.button.onPointerUpObservable.add(() => onContinue());
		this.overlay.add(this.button);

		this.skipButton = Button.CreateSimpleButton('continue-skip', 'GIVE UP');
		this.skipButton.width = '180px';
		this.skipButton.height = '48px';
		this.skipButton.color = '#A0A0A0';
		this.skipButton.background = '#15181C';
		this.skipButton.fontSize = 20;
		this.skipButton.thickness = 1;
		this.skipButton.cornerRadius = 4;
		this.skipButton.top = '180px';
		this.skipButton.onPointerUpObservable.add(() => onTimeout());
		this.overlay.add(this.skipButton);

		this.startedAt = now();
		this.tick();
	}

	private tick = (): void => {
		const elapsed = now() - this.startedAt;
		this.remainingMs = Math.max(0, COUNTDOWN_MS - elapsed);
		const seconds = Math.ceil(this.remainingMs / 1000);
		this.countdown.text = String(seconds);
		if (this.remainingMs <= 0) {
			this.onTimeout();
			return;
		}
		this.rafHandle = requestAnimationFrame(this.tick);
	};

	dispose(): void {
		cancelAnimationFrame(this.rafHandle);
		this.overlay.remove(this.title);
		this.overlay.remove(this.quartersLabel);
		this.overlay.remove(this.countdown);
		this.overlay.remove(this.button);
		this.overlay.remove(this.skipButton);
	}
}
