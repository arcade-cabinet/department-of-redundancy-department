import { describe, expect, it } from 'vitest';
import {
	type AutoEngageInput,
	clearEngageTarget,
	freshAutoEngage,
	setEngageTarget,
	tickAutoEngage,
} from './autoEngage';

function inputAt(
	state: ReturnType<typeof freshAutoEngage>,
	overrides: Partial<AutoEngageInput> = {},
): AutoEngageInput {
	return {
		state,
		now: 0,
		targetAlive: true,
		targetVisible: true,
		targetInRange: true,
		weaponReady: true,
		...overrides,
	};
}

describe('autoEngage', () => {
	it('idle (no target) → no-op', () => {
		const s = freshAutoEngage();
		const r = tickAutoEngage(inputAt(s));
		expect(r.action.fire).toBe(false);
		expect(r.action.clear).toBe(false);
	});

	it('engage target with weapon ready → fire', () => {
		const s = setEngageTarget(freshAutoEngage(), 'mgr-1', 0);
		const r = tickAutoEngage(inputAt(s));
		expect(r.action.fire).toBe(true);
	});

	it('target dead → clear engage', () => {
		const s = setEngageTarget(freshAutoEngage(), 'mgr-1', 0);
		const r = tickAutoEngage(inputAt(s, { targetAlive: false }));
		expect(r.action.clear).toBe(true);
		expect(r.state.targetId).toBeNull();
	});

	it('lost LOS → hold lock, no fire, no clear', () => {
		const s = setEngageTarget(freshAutoEngage(), 'mgr-1', 0);
		const r = tickAutoEngage(inputAt(s, { targetVisible: false }));
		expect(r.action.fire).toBe(false);
		expect(r.action.clear).toBe(false);
		expect(r.state.targetId).toBe('mgr-1');
	});

	it('out of range → hold lock, no fire', () => {
		const s = setEngageTarget(freshAutoEngage(), 'mgr-1', 0);
		const r = tickAutoEngage(inputAt(s, { targetInRange: false }));
		expect(r.action.fire).toBe(false);
		expect(r.state.targetId).toBe('mgr-1');
	});

	it('weapon cooling down → no fire', () => {
		const s = setEngageTarget(freshAutoEngage(), 'mgr-1', 0);
		const r = tickAutoEngage(inputAt(s, { weaponReady: false }));
		expect(r.action.fire).toBe(false);
	});

	it('re-tap same target = no-op (acquiredAt unchanged)', () => {
		const s = setEngageTarget(freshAutoEngage(), 'mgr-1', 0);
		const s2 = setEngageTarget(s, 'mgr-1', 5);
		expect(s).toBe(s2);
	});

	it('switch target updates state', () => {
		const s = setEngageTarget(freshAutoEngage(), 'mgr-1', 0);
		const s2 = setEngageTarget(s, 'mgr-2', 5);
		expect(s2.targetId).toBe('mgr-2');
		expect(s2.acquiredAt).toBe(5);
	});

	it('clear cancels lock', () => {
		const s = setEngageTarget(freshAutoEngage(), 'mgr-1', 0);
		const c = clearEngageTarget(s);
		expect(c.targetId).toBeNull();
	});
});
