import { describe, expect, it, vi } from 'vitest';
import { audioCues, emit } from './cues';

describe('audio cues', () => {
	it('subscribers receive emitted events', () => {
		const seen: Array<{ type: string; floor?: number }> = [];
		const off = audioCues.on((ev) => seen.push(ev));
		emit({ type: 'floor-arrival', floor: 4 });
		expect(seen).toEqual([{ type: 'floor-arrival', floor: 4 }]);
		off();
	});

	it('unsubscribed listeners stop receiving events', () => {
		const fn = vi.fn();
		const off = audioCues.on(fn);
		off();
		emit({ type: 'floor-arrival', floor: 1 });
		expect(fn).not.toHaveBeenCalled();
	});

	it('multiple listeners all receive an event', () => {
		const a = vi.fn();
		const b = vi.fn();
		const offA = audioCues.on(a);
		const offB = audioCues.on(b);
		emit({ type: 'floor-arrival', floor: 2 });
		expect(a).toHaveBeenCalledOnce();
		expect(b).toHaveBeenCalledOnce();
		offA();
		offB();
	});
});
