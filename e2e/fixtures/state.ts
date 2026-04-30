import type { Page } from '@playwright/test';

/**
 * Runtime state introspection (PRQ-17 T2, M3c1). The runtime exposes
 * a debug-only `window.__dord` namespace gated on `?test=1` so e2e
 * specs can read live floor / threat / kill counts without prying
 * into private React state. Tests must include `?test=1` in the
 * page URL or the namespace is absent (no-op for production builds).
 *
 * The actual Game.tsx wiring of __dord lands in the same M3c1 commit;
 * this fixture is the read interface.
 */

export interface DordState {
	floor: number;
	threat: number;
	kills: number;
	playedSeconds: number;
	playerHp: number;
	bossAlive: boolean;
}

export async function readDordState(page: Page): Promise<DordState> {
	// __dord installs via a useEffect after the Game canvas mounts;
	// poll briefly so a fast test doesn't race the install.
	await page.waitForFunction(
		() => {
			const w = window as unknown as { __dord?: { state?: () => unknown } };
			return typeof w.__dord?.state === 'function';
		},
		undefined,
		{ timeout: 5000 },
	);
	return page.evaluate((): DordState => {
		const w = window as unknown as { __dord?: { state(): DordState } };
		if (!w.__dord) {
			throw new Error('window.__dord not available — boot with ?test=1');
		}
		return w.__dord.state();
	});
}

/** Force the current floor for boss-gate / floor-transition specs. */
export async function setFloor(page: Page, floor: number): Promise<void> {
	await page.evaluate((f: number) => {
		const w = window as unknown as { __dord?: { setFloor(n: number): void } };
		if (!w.__dord?.setFloor) throw new Error('__dord.setFloor unavailable');
		w.__dord.setFloor(f);
	}, floor);
}

/** Damage the boss by `dmg` HP. Used in @golden boss-gate spec to
 *  fast-kill the Reaper without scripting the full combat loop. */
export async function damageBoss(page: Page, dmg: number): Promise<void> {
	await page.evaluate((d: number) => {
		const w = window as unknown as { __dord?: { damageBoss(n: number): void } };
		if (!w.__dord?.damageBoss) throw new Error('__dord.damageBoss unavailable');
		w.__dord.damageBoss(d);
	}, dmg);
}
