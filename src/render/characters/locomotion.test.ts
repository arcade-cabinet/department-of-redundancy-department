import { describe, expect, it } from 'vitest';
import {
	ATTACK_LUNGE_DISTANCE,
	ATTACK_LUNGE_DURATION_MS,
	attackLunge,
	DEATH_ROT_DURATION_MS,
	deathDissolve,
	deathRotZ,
	HIT_DURATION_MS,
	HOP_HEIGHT_RUN,
	HOP_HEIGHT_WALK,
	hitFlash,
	hitShake,
	hopY,
	idleBreathe,
	isDeathComplete,
	isLanding,
	rotXLean,
	rotZRock,
	transition,
} from './locomotion';

describe('locomotion math', () => {
	it('hopY = 0 when speed = 0', () => {
		expect(hopY(0, 0)).toBe(0);
		expect(hopY(0.5, 0)).toBe(0);
	});

	it('hopY peaks at half-step, returns to 0 at full step', () => {
		// At t = 0.5/speed, sin(π/2)² = 1 → hopHeight.
		const speed = 1;
		expect(hopY(0.5, speed)).toBeCloseTo(HOP_HEIGHT_WALK, 5);
		// At t = 1/speed, sin(π)² = 0.
		expect(hopY(1, speed)).toBeCloseTo(0, 5);
	});

	it('hopY uses RUN height above the threshold', () => {
		const peak = hopY(0.25, 2); // speed=2 ≥ 1.5
		expect(peak).toBeCloseTo(HOP_HEIGHT_RUN, 5);
	});

	it('rotZRock crosses zero at hop apex', () => {
		// At t such that sin(t*π*speed) = 0: t = 1/speed.
		expect(rotZRock(1, 1)).toBeCloseTo(0, 5);
	});

	it('rotXLean clamps to [0, 0.12]', () => {
		expect(rotXLean(0)).toBe(0);
		expect(rotXLean(-1)).toBe(0);
		expect(rotXLean(10)).toBeCloseTo(0.12, 5);
		expect(rotXLean(1)).toBeCloseTo(0.08, 5);
	});

	it('idleBreathe is bounded ±0.01', () => {
		for (let i = 0; i < 100; i++) {
			const v = idleBreathe(i * 0.1);
			expect(v).toBeGreaterThanOrEqual(-0.011);
			expect(v).toBeLessThanOrEqual(0.011);
		}
	});

	it('isLanding fires only when prev>0 and cur is at floor', () => {
		expect(isLanding(0.05, 0)).toBe(true);
		expect(isLanding(0, 0.05)).toBe(false); // taking off, not landing
		expect(isLanding(0, 0)).toBe(false);
		expect(isLanding(0.1, 0.05)).toBe(false);
	});

	it('attackLunge starts at 0, peaks, returns to 0', () => {
		expect(attackLunge(0)).toBeCloseTo(0, 5);
		expect(attackLunge(ATTACK_LUNGE_DURATION_MS)).toBe(0);
		// Peak around half the duration.
		const peak = attackLunge(ATTACK_LUNGE_DURATION_MS / 2);
		expect(peak).toBeGreaterThan(0);
		expect(peak).toBeLessThanOrEqual(ATTACK_LUNGE_DISTANCE);
	});

	it('hitShake amplitude bounded by ±0.05', () => {
		// Deterministic LCG so the bound check doesn't depend on
		// Math.random() — also satisfies the project's no-Math.random rule.
		let seed = 1;
		const rng = () => {
			seed = (seed * 1103515245 + 12345) & 0x7fffffff;
			return seed / 0x7fffffff;
		};
		for (let t = 0; t < HIT_DURATION_MS; t += 5) {
			const s = hitShake(t, rng);
			expect(Math.abs(s.x)).toBeLessThanOrEqual(0.05);
			expect(Math.abs(s.y)).toBeLessThanOrEqual(0.05);
			expect(Math.abs(s.z)).toBeLessThanOrEqual(0.05);
		}
		// Past duration → zero.
		const post = hitShake(HIT_DURATION_MS + 1, rng);
		expect(post).toEqual({ x: 0, y: 0, z: 0 });
	});

	it('hitFlash decays linearly from 1 to 0', () => {
		expect(hitFlash(0)).toBe(1);
		expect(hitFlash(HIT_DURATION_MS / 2)).toBeCloseTo(0.5, 5);
		expect(hitFlash(HIT_DURATION_MS)).toBe(0);
		expect(hitFlash(HIT_DURATION_MS * 2)).toBe(0);
	});

	it('deathRotZ goes 0 → π/2', () => {
		expect(deathRotZ(0)).toBe(0);
		expect(deathRotZ(DEATH_ROT_DURATION_MS / 2)).toBeCloseTo(Math.PI / 4, 5);
		expect(deathRotZ(DEATH_ROT_DURATION_MS)).toBeCloseTo(Math.PI / 2, 5);
		expect(deathRotZ(DEATH_ROT_DURATION_MS + 100)).toBeCloseTo(Math.PI / 2, 5);
	});

	it('deathDissolve only kicks in after rotation finishes', () => {
		expect(deathDissolve(0)).toBe(0);
		expect(deathDissolve(DEATH_ROT_DURATION_MS)).toBe(0);
		expect(deathDissolve(DEATH_ROT_DURATION_MS + 250)).toBeCloseTo(0.5, 5);
		expect(deathDissolve(DEATH_ROT_DURATION_MS + 500)).toBe(1);
	});

	it('isDeathComplete after both phases', () => {
		expect(isDeathComplete(0)).toBe(false);
		expect(isDeathComplete(DEATH_ROT_DURATION_MS + 499)).toBe(false);
		expect(isDeathComplete(DEATH_ROT_DURATION_MS + 500)).toBe(true);
	});
});

describe('locomotion FSM', () => {
	const init = { state: 'idle' as const, elapsedMs: 0 };

	it('set-state transitions idle ↔ walk', () => {
		const r = transition(init, { kind: 'set-state', to: 'walk' });
		expect(r.state).toBe('walk');
		expect(r.elapsedMs).toBe(0);
	});

	it('attack from walk returns to idle on tick after duration', () => {
		const a = transition(init, { kind: 'attack' });
		expect(a.state).toBe('attack');
		const t = transition(a, { kind: 'tick', elapsedMs: ATTACK_LUNGE_DURATION_MS + 1 });
		expect(t.state).toBe('idle');
	});

	it('hit from walk returns to idle on tick after duration', () => {
		const h = transition({ state: 'walk', elapsedMs: 0 }, { kind: 'hit' });
		expect(h.state).toBe('hit');
		const t = transition(h, { kind: 'tick', elapsedMs: HIT_DURATION_MS + 1 });
		expect(t.state).toBe('idle');
	});

	it('death is absorbing — set-state ignored', () => {
		const d = transition(init, { kind: 'die' });
		expect(d.state).toBe('death');
		const noop = transition(d, { kind: 'set-state', to: 'walk' });
		expect(noop.state).toBe('death');
	});

	it('attack ignored mid-hit; hit cancels attack', () => {
		const a = transition(init, { kind: 'attack' });
		const stillAttack = transition(a, { kind: 'attack' }); // self-replay starts new attack
		// Re-attacking RESTARTS the attack (matches game feel — interruptable combo).
		// Spec doesn't forbid that; document via behavior.
		expect(stillAttack.state).toBe('attack');

		// Hit cancels attack.
		const hitDuringAttack = transition(a, { kind: 'hit' });
		expect(hitDuringAttack.state).toBe('hit');

		// Attack during hit → ignored.
		const attackDuringHit = transition(hitDuringAttack, { kind: 'attack' });
		expect(attackDuringHit.state).toBe('hit');
	});

	it('die can interrupt attack/hit', () => {
		const a = transition(init, { kind: 'attack' });
		const d = transition(a, { kind: 'die' });
		expect(d.state).toBe('death');
	});

	it('tick accumulates elapsedMs in non-terminal states', () => {
		const w = transition(init, { kind: 'set-state', to: 'walk' });
		const t1 = transition(w, { kind: 'tick', elapsedMs: 16 });
		const t2 = transition(t1, { kind: 'tick', elapsedMs: 16 });
		expect(t2.elapsedMs).toBe(32);
		expect(t2.state).toBe('walk');
	});
});
