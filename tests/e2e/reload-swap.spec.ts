import { expect, test } from '@playwright/test';
import {
	gotoApp,
	insertCoin,
	jumpToLevel,
	setGodMode,
	waitForLevel,
	waitForLevelReady,
	waitForPhase,
} from '../harness/dord';

/**
 * PRQ D.5 — reload + weapon-swap e2e.
 *
 * Two distinct flows:
 *   1. Auto-reload on dry-pull. Empty the magazine via tryFire(); the
 *      next tryFire kicks off a reload (reloadEndsAtMs goes non-null).
 *      After reloadDurationMs of simulated time, ammo replenishes.
 *   2. Weapon-swap cancels in-flight reload. Start a reload, then
 *      swap. reloadEndsAtMs flips back to null (cancelled) and active
 *      weapon changes.
 *
 * Both flows drive `__dord.game` directly via page.evaluate — the
 * pointerdown/keypress paths are covered by other e2e tests; this
 * file pins the pure state-machine behaviour from the runtime.
 */

interface WeaponSnapshot {
	readonly active: 'pistol' | 'rifle';
	readonly pistolAmmo: number;
	readonly rifleAmmo: number;
	readonly reloadEndsAtMs: number | null;
}

async function readWeapon(page: import('@playwright/test').Page): Promise<WeaponSnapshot> {
	return page.evaluate((): WeaponSnapshot => {
		const game = globalThis.__dord?.game;
		if (!game) throw new Error('__dord.game missing');
		const w = game.getState().run?.weapon;
		if (!w) throw new Error('no active weapon');
		return {
			active: w.active,
			pistolAmmo: w.pistolAmmo,
			rifleAmmo: w.rifleAmmo,
			reloadEndsAtMs: w.reloadEndsAtMs,
		};
	});
}

test.describe('reload (PRQ D.5 / 1)', () => {
	test('emptying the mag triggers auto-reload on the dry-pull', async ({ page }) => {
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');
		await jumpToLevel(page, 'lobby');
		await waitForLevel(page, 'lobby');
		await waitForLevelReady(page);

		const initial = await readWeapon(page);
		expect(initial.active).toBe('pistol');
		expect(initial.pistolAmmo).toBeGreaterThan(0);
		expect(initial.reloadEndsAtMs).toBeNull();

		// Drain the mag: call tryFire pistolAmmo times. The (n+1)th call
		// is the dry-pull that auto-starts the reload.
		await page.evaluate((shotsToFire: number) => {
			const dord = globalThis.__dord;
			if (!dord) throw new Error('__dord missing');
			for (let i = 0; i < shotsToFire; i++) {
				dord.game.tryFire(dord.now() + i);
			}
		}, initial.pistolAmmo + 1);

		const afterDry = await readWeapon(page);
		expect(afterDry.pistolAmmo).toBe(0);
		expect(afterDry.reloadEndsAtMs).not.toBeNull();
	});
});

test.describe('weapon-swap (PRQ D.5 / 2)', () => {
	test('swapWeapon cancels an in-flight reload', async ({ page }) => {
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');
		await jumpToLevel(page, 'lobby');
		await waitForLevel(page, 'lobby');
		await waitForLevelReady(page);

		// Drain the pistol mag and dry-fire to start a reload.
		const initial = await readWeapon(page);
		await page.evaluate((n: number) => {
			const dord = globalThis.__dord;
			if (!dord) throw new Error('__dord missing');
			for (let i = 0; i < n; i++) dord.game.tryFire(dord.now() + i);
		}, initial.pistolAmmo + 1);

		const reloading = await readWeapon(page);
		expect(reloading.reloadEndsAtMs).not.toBeNull();

		// Swap weapons mid-reload — should flip active AND clear
		// reloadEndsAtMs (the player chose to swap rather than wait).
		const swapped = await page.evaluate(() => globalThis.__dord?.game.swapWeapon() ?? false);
		expect(swapped).toBe(true);

		const after = await readWeapon(page);
		expect(after.active).toBe('rifle');
		expect(after.reloadEndsAtMs).toBeNull();
	});
});
