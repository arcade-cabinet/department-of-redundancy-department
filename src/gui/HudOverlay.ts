import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { comboMultiplier, type GameState, WEAPONS } from '../game/GameState';
import {
	COLOR_HP_HIGH,
	COLOR_HP_LOW,
	COLOR_HP_MID,
	COLOR_PAPER,
	FONT_BODY,
	FONT_DISPLAY,
} from './brand';
import type { Overlay } from './Overlay';

const HP_BAR_WIDTH = 320;
const HP_BAR_THICKNESS = 2;
const HP_FILL_MAX_WIDTH = HP_BAR_WIDTH - HP_BAR_THICKNESS * 2;

/**
 * Heads-up display: top strip carrying HP bar (left), score + combo (center),
 * lives stack (right). Mounted by main.ts during the 'playing' and
 * 'continue-prompt' phases, and disposed when leaving those phases.
 *
 * Reads GameState every frame the Game emits an update; never reads from the
 * encounter director directly (HP / lives / score belong to GameState).
 */
export class HudOverlay {
	private readonly hpBar: Rectangle;
	private readonly hpFill: Rectangle;
	private readonly hpLabel: TextBlock;
	private readonly scoreLabel: TextBlock;
	private readonly comboLabel: TextBlock;
	private readonly livesLabel: TextBlock;
	private readonly ammoLabel: TextBlock;
	private readonly controls: readonly Control[];

	constructor(private readonly overlay: Overlay) {
		this.hpBar = new Rectangle('hud-hp-bar');
		this.hpBar.width = `${HP_BAR_WIDTH}px`;
		this.hpBar.height = '24px';
		this.hpBar.thickness = HP_BAR_THICKNESS;
		this.hpBar.color = COLOR_PAPER;
		this.hpBar.background = 'rgba(21, 24, 28, 0.6)';
		this.hpBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.hpBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.hpBar.left = '24px';
		this.hpBar.top = '24px';

		this.hpFill = new Rectangle('hud-hp-fill');
		this.hpFill.thickness = 0;
		this.hpFill.background = COLOR_HP_HIGH;
		this.hpFill.height = '20px';
		this.hpFill.width = `${HP_FILL_MAX_WIDTH}px`;
		this.hpFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.hpFill.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		this.hpBar.addControl(this.hpFill);

		this.hpLabel = new TextBlock('hud-hp-label', 'HP 100');
		this.hpLabel.color = COLOR_PAPER;
		this.hpLabel.fontSize = 14;
		this.hpLabel.fontFamily = FONT_BODY;
		this.hpLabel.fontWeight = 'bold';
		this.hpLabel.shadowColor = 'rgba(0, 0, 0, 0.95)';
		this.hpLabel.shadowBlur = 0;
		this.hpLabel.shadowOffsetX = 1;
		this.hpLabel.shadowOffsetY = 1;
		this.hpBar.addControl(this.hpLabel);

		this.scoreLabel = new TextBlock('hud-score', '0');
		this.scoreLabel.color = COLOR_PAPER;
		this.scoreLabel.fontSize = 36;
		this.scoreLabel.fontFamily = FONT_DISPLAY;
		this.scoreLabel.fontWeight = 'bold';
		this.scoreLabel.height = '40px';
		this.scoreLabel.width = '320px';
		this.scoreLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.scoreLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.scoreLabel.top = '20px';

		this.comboLabel = new TextBlock('hud-combo', '');
		this.comboLabel.color = COLOR_HP_MID;
		this.comboLabel.fontSize = 18;
		this.comboLabel.fontFamily = FONT_BODY;
		this.comboLabel.fontWeight = 'bold';
		this.comboLabel.height = '24px';
		this.comboLabel.width = '320px';
		this.comboLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.comboLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.comboLabel.top = '60px';

		this.livesLabel = new TextBlock('hud-lives', '♥ ♥ ♥');
		this.livesLabel.color = COLOR_HP_LOW;
		this.livesLabel.fontSize = 28;
		this.livesLabel.fontFamily = FONT_DISPLAY;
		this.livesLabel.height = '40px';
		this.livesLabel.width = '160px';
		this.livesLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.livesLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.livesLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.livesLabel.left = '-24px';
		this.livesLabel.top = '24px';

		this.ammoLabel = new TextBlock('hud-ammo', 'PISTOL  8 / 8');
		this.ammoLabel.color = COLOR_PAPER;
		this.ammoLabel.fontSize = 22;
		this.ammoLabel.fontFamily = FONT_DISPLAY;
		this.ammoLabel.fontWeight = 'bold';
		this.ammoLabel.height = '32px';
		this.ammoLabel.width = '240px';
		this.ammoLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.ammoLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.ammoLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.ammoLabel.left = '-24px';
		this.ammoLabel.top = '70px';
		this.ammoLabel.shadowColor = 'rgba(0, 0, 0, 0.95)';
		this.ammoLabel.shadowBlur = 0;
		this.ammoLabel.shadowOffsetX = 1;
		this.ammoLabel.shadowOffsetY = 1;

		this.controls = [this.hpBar, this.scoreLabel, this.comboLabel, this.livesLabel, this.ammoLabel];
		for (const c of this.controls) overlay.add(c);
	}

	render(state: GameState): void {
		const run = state.run;
		if (!run) return;
		const hpFrac = Math.max(0, Math.min(1, run.playerHp / run.maxPlayerHp));
		this.hpFill.width = `${Math.round(HP_FILL_MAX_WIDTH * hpFrac)}px`;
		this.hpFill.background = hpColorFor(hpFrac);
		this.hpLabel.text = `HP ${Math.max(0, Math.round(run.playerHp))}`;

		this.scoreLabel.text = run.score.toLocaleString();

		const combo = run.comboCount;
		if (combo >= 2) {
			this.comboLabel.text = `${combo}× chain · ${comboMultiplier(combo).toFixed(2)}× score`;
		} else {
			this.comboLabel.text = '';
		}

		this.livesLabel.text = '♥ '.repeat(Math.max(0, run.remainingLives)).trimEnd();

		const w = run.weapon;
		const ammo = w.active === 'pistol' ? w.pistolAmmo : w.rifleAmmo;
		const mag = WEAPONS[w.active].magSize;
		const reloading = w.reloadEndsAtMs !== null;
		this.ammoLabel.text = reloading
			? `${w.active.toUpperCase()}  reloading…`
			: `${w.active.toUpperCase()}  ${ammo} / ${mag}`;
		this.ammoLabel.color = ammo === 0 && !reloading ? COLOR_HP_LOW : COLOR_PAPER;
	}

	dispose(): void {
		for (const c of this.controls) this.overlay.remove(c);
	}
}

function hpColorFor(frac: number): string {
	if (frac > 0.66) return COLOR_HP_HIGH;
	if (frac > 0.33) return COLOR_HP_MID;
	return COLOR_HP_LOW;
}
