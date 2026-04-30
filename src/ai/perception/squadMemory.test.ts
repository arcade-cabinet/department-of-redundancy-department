import { describe, expect, it } from 'vitest';
import { Vector3 } from 'yuka';
import { createSquadRegistry } from './squadMemory';

describe('SquadMemoryRegistry', () => {
	it('register + get returns fresh memory', () => {
		const r = createSquadRegistry();
		r.register('s1');
		const m = r.get('s1');
		expect(m.lastSeenAt).toBe(Number.NEGATIVE_INFINITY);
		expect(r.memberCount('s1')).toBe(1);
	});

	it('one member sighting → all squad members see updated memory', () => {
		const r = createSquadRegistry();
		r.register('s1');
		r.register('s1');
		r.register('s1');
		expect(r.memberCount('s1')).toBe(3);
		r.update('s1', true, 10, new Vector3(5, 0, 5));
		const m = r.get('s1');
		expect(m.lastSeenAt).toBe(10);
		expect(m.lastSeenPosition?.x).toBe(5);
	});

	it('update with visible=false is a no-op', () => {
		const r = createSquadRegistry();
		r.register('s1');
		r.update('s1', true, 10, new Vector3(1, 0, 1));
		const before = r.get('s1');
		r.update('s1', false, 20, new Vector3(99, 0, 99));
		const after = r.get('s1');
		expect(after.lastSeenAt).toBe(before.lastSeenAt);
	});

	it('unregister decrements; full unregister wipes memory', () => {
		const r = createSquadRegistry();
		r.register('s1');
		r.register('s1');
		r.update('s1', true, 10, new Vector3(0, 0, 0));
		r.unregister('s1');
		expect(r.memberCount('s1')).toBe(1);
		expect(r.get('s1').lastSeenAt).toBe(10);
		r.unregister('s1');
		// Last unregister wiped the entry; fresh get returns -Infinity.
		expect(r.memberCount('s1')).toBe(0);
		expect(r.get('s1').lastSeenAt).toBe(Number.NEGATIVE_INFINITY);
	});

	it('different squad ids are isolated', () => {
		const r = createSquadRegistry();
		r.register('a');
		r.register('b');
		r.update('a', true, 5, new Vector3(1, 0, 1));
		expect(r.get('b').lastSeenAt).toBe(Number.NEGATIVE_INFINITY);
		expect(r.get('a').lastSeenAt).toBe(5);
	});
});
