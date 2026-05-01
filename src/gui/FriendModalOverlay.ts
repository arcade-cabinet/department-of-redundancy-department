import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { FRIEND_BAILOUT_GRANT } from '../game/quarters';
import type { Overlay } from './Overlay';

/**
 * Friend modal — fires when the player has 0 quarters and taps INSERT COIN.
 * Per docs/spec/06-economy.md: storytelling/immersion mechanic, not a
 * scarcity gate. Always available, no cooldown, no daily lockout.
 *
 * On dismiss, the caller has already granted +FRIEND_BAILOUT_GRANT quarters.
 * The overlay is purely cosmetic — it tells the player what just happened.
 */
export class FriendModalOverlay {
	private readonly title: TextBlock;
	private readonly body: TextBlock;
	private readonly grant: TextBlock;
	private readonly button: Button;

	constructor(
		private readonly overlay: Overlay,
		onContinue: () => void,
	) {
		this.title = new TextBlock('friend-title');
		this.title.text = 'YOUR FRIEND SPOTS YOU';
		this.title.color = '#FFD55A';
		this.title.fontSize = 56;
		this.title.fontWeight = 'bold';
		this.title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.title.top = '-180px';
		this.title.outlineColor = '#000000';
		this.title.outlineWidth = 4;
		this.overlay.add(this.title);

		this.body = new TextBlock('friend-body');
		this.body.text = 'A COUPLE BUCKS';
		this.body.color = '#FFFFFF';
		this.body.fontSize = 40;
		this.body.fontWeight = 'bold';
		this.body.top = '-100px';
		this.body.outlineColor = '#000000';
		this.body.outlineWidth = 3;
		this.overlay.add(this.body);

		this.grant = new TextBlock('friend-grant');
		this.grant.text = `+ ${FRIEND_BAILOUT_GRANT} QUARTERS`;
		this.grant.color = '#FFD55A';
		this.grant.fontSize = 48;
		this.grant.fontWeight = 'bold';
		this.grant.top = '0px';
		this.grant.outlineColor = '#000000';
		this.grant.outlineWidth = 3;
		this.overlay.add(this.grant);

		this.button = Button.CreateSimpleButton('friend-continue', 'INSERT COIN');
		this.button.width = '320px';
		this.button.height = '80px';
		this.button.color = '#FFFFFF';
		this.button.background = '#15181C';
		this.button.fontSize = 32;
		this.button.fontWeight = 'bold';
		this.button.thickness = 3;
		this.button.cornerRadius = 8;
		this.button.top = '120px';
		this.button.onPointerUpObservable.add(() => onContinue());
		this.overlay.add(this.button);
	}

	dispose(): void {
		this.overlay.remove(this.title);
		this.overlay.remove(this.body);
		this.overlay.remove(this.grant);
		this.overlay.remove(this.button);
	}
}
