import { Control } from '@babylonjs/gui/2D/controls/control';
import { Ellipse } from '@babylonjs/gui/2D/controls/ellipse';
import type { Overlay } from './Overlay';

export type ReticleColor = 'green' | 'orange' | 'red' | 'blue' | 'gold';

const COLOUR_HEX: Readonly<Record<ReticleColor, string>> = {
	green: '#3FFF7F',
	orange: '#FFA040',
	red: '#FF3030',
	blue: '#3FA0FF',
	// `gold` signals an open justice-glint window — precision-shot bonus
	// available. Wins over HP-band coloring per `picking.reticleColorFor`.
	gold: '#FFD440',
};

/**
 * Virtua-Cop 3-state reticle (green / orange / red), plus blue for civilians
 * and gold for justice-shot opportunities. HUD signal only — does NOT gate
 * aiming. Reticle is rendered at the player's tap/drag position each frame.
 */
export class Reticle {
	private readonly outer: Ellipse;
	private readonly inner: Ellipse;
	private color: ReticleColor = 'green';

	constructor(private readonly overlay: Overlay) {
		this.outer = new Ellipse('reticle-outer');
		this.outer.width = '64px';
		this.outer.height = '64px';
		this.outer.color = COLOUR_HEX.green;
		this.outer.thickness = 3;
		this.outer.background = 'transparent';
		this.outer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.outer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.outer.left = '0px';
		this.outer.top = '0px';
		this.overlay.add(this.outer);

		this.inner = new Ellipse('reticle-inner');
		this.inner.width = '8px';
		this.inner.height = '8px';
		this.inner.color = COLOUR_HEX.green;
		this.inner.thickness = 0;
		this.inner.background = COLOUR_HEX.green;
		this.inner.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.inner.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.overlay.add(this.inner);
		// Hidden by default; main.ts shows it only during the 'playing' phase.
		this.outer.isVisible = false;
		this.inner.isVisible = false;
	}

	setPosition(xPx: number, yPx: number): void {
		this.outer.left = `${xPx - 32}px`;
		this.outer.top = `${yPx - 32}px`;
		this.inner.left = `${xPx - 4}px`;
		this.inner.top = `${yPx - 4}px`;
	}

	setVisible(visible: boolean): void {
		this.outer.isVisible = visible;
		this.inner.isVisible = visible;
	}

	setColor(color: ReticleColor): void {
		if (color === this.color) return;
		this.color = color;
		const hex = COLOUR_HEX[color];
		this.outer.color = hex;
		this.inner.color = hex;
		this.inner.background = hex;
	}

	dispose(): void {
		this.overlay.remove(this.outer);
		this.overlay.remove(this.inner);
	}
}
