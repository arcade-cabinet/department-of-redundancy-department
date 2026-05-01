import type { Scene } from '@babylonjs/core/scene';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import type { Control } from '@babylonjs/gui/2D/controls/control';

/**
 * Thin wrapper around AdvancedDynamicTexture for fullscreen GUI overlays.
 * Each overlay (insert-coin, continue, game-over, settings, HUD reticle)
 * owns one of these and adds/removes Babylon GUI controls.
 *
 * IMPORTANT: bind to a long-lived UI scene that survives gameplay scene
 * swaps. ADTs are owned by their host scene; if the title scene is
 * `dispose()`d on INSERT COIN, the GUI surface dies with it and every
 * subsequent overlay (HUD, reticle, continue prompt, game over) silently
 * mounts onto a dead texture. Pass the persistent UI scene from main.ts.
 */
export class Overlay {
	readonly texture: AdvancedDynamicTexture;
	private readonly children: Set<Control> = new Set();

	constructor(name: string, scene: Scene) {
		this.texture = AdvancedDynamicTexture.CreateFullscreenUI(name, true, scene);
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
