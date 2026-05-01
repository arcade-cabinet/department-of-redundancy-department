import { expect, test } from '@playwright/test';
import {
	gotoApp,
	insertCoin,
	jumpToLevel,
	readEnemySnapshots,
	setGodMode,
	waitForEnemySpawn,
	waitForLevel,
	waitForLevelReady,
	waitForPhase,
} from '../harness/dord';

/**
 * Fire→kill e2e gate. Pins the full shooting pipeline end-to-end:
 *
 *   pointerdown on canvas
 *     → pickAt() raycast against capsule mesh
 *     → game.tryFire() consumes ammo
 *     → director.hitEnemy(...) damages enemy
 *     → onEnemyKill listener disposes mesh
 *
 * The previous coverage stopped at director-level unit tests on `hitEnemy`,
 * which proved the kill-math but never proved the runtime wiring. The
 * `__dord.enemySnapshots()` surface returns CSS-pixel coords for every
 * active enemy capsule, which we hand to the canvas's pointerdown listener
 * via a synthetic event so the real pickray runs.
 *
 * The lobby is the canonical first level and reliably spawns at least one
 * enemy within the first few simulated seconds — perfect for this gate.
 */

test.describe('fire → kill', () => {
	test('clicking on an enemy capsule kills it', async ({ page }) => {
		await gotoApp(page);
		await setGodMode(page, true);
		await insertCoin(page);
		await waitForPhase(page, 'playing');
		await jumpToLevel(page, 'lobby');
		await waitForLevel(page, 'lobby');
		await waitForLevelReady(page);

		// Wait for the director to spawn at least one enemy. fastForward
		// drives the encounter director's tick, which fires cues based on
		// rail position + dwell time. The lobby's first wave fires in the
		// first dwell window.
		const initialSnapshots = await waitForEnemySpawn(page);
		expect(initialSnapshots.length).toBeGreaterThan(0);

		// Pick the first live enemy. Capture its id so we can verify the
		// snapshots no longer contain it after the click — proving the full
		// pickray → hitEnemy → onEnemyKill chain ran.
		const target = initialSnapshots[0];
		if (!target) throw new Error('expected an enemy in initialSnapshots');
		const targetId = target.id;

		// Some grunts have HP > body damage from the default weapon, and
		// enemies advance along their spawn rail every director tick — so
		// we re-read the projected center RIGHT before each click rather
		// than capturing it once. The ts-browser-game profile mandates the
		// test rely on the real engine pipeline, not a frozen snapshot.
		//
		// We dispatch pointerdown directly on the canvas rather than
		// `page.mouse.click`. Babylon's pointer handling reads `clientX`/
		// `clientY` straight off the event and doesn't depend on the
		// browser's event-routing — this gives us deterministic coord
		// delivery without window-focus / hover-trail flakiness.
		const lastSeen = { hp: target.hp, x: 0, y: 0 };
		for (let i = 0; i < 8; i++) {
			const snaps = await readEnemySnapshots(page);
			const live = snaps.find((s) => s.id === targetId);
			if (!live) return;
			lastSeen.hp = live.hp;
			lastSeen.x = live.clientX;
			lastSeen.y = live.clientY;
			await page.evaluate(
				(coord: { x: number; y: number }) => {
					const canvas = document.querySelector('canvas#game');
					if (!canvas) throw new Error('canvas#game missing');
					const evt = new PointerEvent('pointerdown', {
						clientX: coord.x,
						clientY: coord.y,
						bubbles: true,
						cancelable: true,
						pointerType: 'mouse',
						button: 0,
					});
					canvas.dispatchEvent(evt);
				},
				{ x: live.clientX, y: live.clientY },
			);
		}

		throw new Error(
			`enemy ${targetId} survived 8 clicks (last shot at (${lastSeen.x.toFixed(0)}, ${lastSeen.y.toFixed(0)})) — ` +
				`hp went from ${target.hp} to ${lastSeen.hp}, ` +
				`suggesting pickray missed (regression in projection or pointer wiring)`,
		);
	});
});
