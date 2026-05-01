import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Grid } from '@babylonjs/gui/2D/controls/grid';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { Difficulty } from '../encounter';
import { type DailyModifierDef, selectDailyModifier } from '../game/dailyChallenge';
import type { GameMode } from '../game/GameState';
import type { Lives } from '../preferences';
import {
	COLOR_DIM,
	COLOR_HP_LOW,
	COLOR_INK,
	COLOR_MUTED,
	COLOR_PAPER,
	FONT_BODY,
	FONT_DISPLAY,
} from './brand';
import type { Overlay } from './Overlay';

/**
 * 5×2 difficulty + lives picker. Replaces the auto-jump in main.ts:
 * 'difficulty-select' phase. Locked rows render disabled.
 *
 * Mirrors docs/spec/03-difficulty-and-modifiers.md grid:
 *   easy / normal / hard / nightmare / un  ×  three-lives / permadeath
 */

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'nightmare', 'un'];
const LIVES: readonly { id: Lives; label: string }[] = [
	{ id: 'three-lives', label: '3 LIVES' },
	{ id: 'permadeath', label: 'PERMADEATH' },
];

const DIFFICULTY_LABEL: Readonly<Record<Difficulty, string>> = {
	easy: 'EASY',
	normal: 'NORMAL',
	hard: 'HARD',
	nightmare: 'NIGHTMARE',
	un: 'ULTRA NIGHTMARE',
};

export class DifficultySelectOverlay {
	private readonly title: TextBlock;
	private readonly grid: Grid;
	private readonly footnote: TextBlock;
	private readonly buttons: Button[] = [];

	private readonly dailyButton: Button;
	private readonly dailyLabel: TextBlock;

	constructor(
		private readonly overlay: Overlay,
		unlocked: readonly Difficulty[],
		onChoose: (
			difficulty: Difficulty,
			lives: Lives,
			mode: GameMode,
			dailyModifier: DailyModifierDef | null,
		) => void,
	) {
		this.title = new TextBlock('diffsel-title', 'CHOOSE YOUR FATE');
		this.title.color = COLOR_PAPER;
		this.title.fontSize = 48;
		this.title.fontWeight = 'bold';
		this.title.fontFamily = FONT_DISPLAY;
		this.title.outlineColor = COLOR_INK;
		this.title.outlineWidth = 4;
		this.title.top = '-280px';
		this.title.height = '60px';
		this.overlay.add(this.title);

		this.grid = new Grid('diffsel-grid');
		this.grid.width = '900px';
		this.grid.height = '420px';
		this.grid.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.grid.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		const rowFraction = 1 / DIFFICULTIES.length;
		for (let i = 0; i < DIFFICULTIES.length; i++) this.grid.addRowDefinition(rowFraction);
		this.grid.addColumnDefinition(0.5);
		this.grid.addColumnDefinition(0.5);

		for (const [row, difficulty] of DIFFICULTIES.entries()) {
			const isUnlocked = unlocked.includes(difficulty);
			for (const [col, lives] of LIVES.entries()) {
				const btn = Button.CreateSimpleButton(
					`diffsel-${difficulty}-${lives.id}`,
					`${DIFFICULTY_LABEL[difficulty]} · ${lives.label}`,
				);
				btn.height = '72px';
				btn.width = '420px';
				btn.color = isUnlocked ? COLOR_PAPER : COLOR_DIM;
				btn.background = isUnlocked ? COLOR_INK : '#2A2A2A';
				btn.thickness = 2;
				btn.fontSize = 18;
				btn.fontFamily = FONT_BODY;
				btn.fontWeight = 'bold';
				btn.cornerRadius = 6;
				btn.isEnabled = isUnlocked;
				if (isUnlocked) {
					btn.onPointerUpObservable.add(() => onChoose(difficulty, lives.id, 'standard', null));
				}
				this.grid.addControl(btn, row, col);
				this.buttons.push(btn);
			}
		}
		this.overlay.add(this.grid);

		// Today's daily-challenge — fixed Normal difficulty + one modifier
		// chosen deterministically from the UTC date. Resets at midnight UTC.
		const todayMod = selectDailyModifier();
		this.dailyButton = Button.CreateSimpleButton(
			'diffsel-daily',
			`★ TODAY'S CHALLENGE: ${todayMod.title}`,
		);
		this.dailyButton.height = '64px';
		this.dailyButton.width = '560px';
		this.dailyButton.color = COLOR_PAPER;
		this.dailyButton.background = COLOR_HP_LOW;
		this.dailyButton.thickness = 2;
		this.dailyButton.fontSize = 22;
		this.dailyButton.fontFamily = FONT_DISPLAY;
		this.dailyButton.fontWeight = 'bold';
		this.dailyButton.cornerRadius = 8;
		this.dailyButton.top = '260px';
		this.dailyButton.onPointerUpObservable.add(() =>
			onChoose('normal', 'three-lives', 'daily-challenge', todayMod),
		);
		this.overlay.add(this.dailyButton);

		this.dailyLabel = new TextBlock('diffsel-daily-tag', todayMod.tagline);
		this.dailyLabel.color = COLOR_PAPER;
		this.dailyLabel.fontSize = 14;
		this.dailyLabel.fontFamily = FONT_BODY;
		this.dailyLabel.top = '310px';
		this.dailyLabel.height = '20px';
		this.overlay.add(this.dailyLabel);

		this.footnote = new TextBlock('diffsel-footnote');
		this.footnote.text = 'CLEAR A LEVEL TO UNLOCK THE NEXT TIER';
		this.footnote.color = COLOR_MUTED;
		this.footnote.fontSize = 14;
		this.footnote.fontFamily = FONT_BODY;
		this.footnote.top = '345px';
		this.footnote.height = '20px';
		this.overlay.add(this.footnote);
	}

	dispose(): void {
		for (const btn of this.buttons) btn.dispose();
		this.buttons.length = 0;
		this.overlay.remove(this.title);
		this.overlay.remove(this.grid);
		this.overlay.remove(this.dailyButton);
		this.overlay.remove(this.dailyLabel);
		this.overlay.remove(this.footnote);
		this.title.dispose();
		this.grid.dispose();
		this.dailyButton.dispose();
		this.dailyLabel.dispose();
		this.footnote.dispose();
	}
}
