import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import type { Control } from '@babylonjs/gui/2D/controls/control';

/**
 * Thin wrapper around AdvancedDynamicTexture for fullscreen GUI overlays.
 * Each overlay (insert-coin, continue, game-over, settings, HUD reticle)
 * owns one of these and adds/removes Babylon GUI controls.
 */
export class Overlay {
	readonly texture: AdvancedDynamicTexture;
	private readonly children: Set<Control> = new Set();

	constructor(name: string) {
		this.texture = AdvancedDynamicTexture.CreateFullscreenUI(name);
		this.texture.idealWidth = 1080;
		this.texture.renderAtIdealSize = true;
	}

	add(control: Control): void {
		this.texture.addControl(control);
		this.children.add(control);
	}

	remove(control: Control): void {
		this.texture.removeControl(control);
		this.children.delete(control);
	}

	clear(): void {
		for (const child of this.children) {
			this.texture.removeControl(child);
		}
		this.children.clear();
	}

	dispose(): void {
		this.clear();
		this.texture.dispose();
	}

	setVisible(visible: boolean): void {
		this.texture.rootContainer.isVisible = visible;
	}
}
