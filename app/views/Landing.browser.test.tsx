import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const memory = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: vi.fn(async ({ key }: { key: string }) => ({ value: memory.get(key) ?? null })),
		set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
			memory.set(key, value);
		}),
		remove: vi.fn(async ({ key }: { key: string }) => {
			memory.delete(key);
		}),
	},
}));

import { Landing } from './Landing';

describe('Landing', () => {
	beforeEach(() => memory.clear());
	afterEach(() => {
		cleanup();
		memory.clear();
	});

	it('renders CLOCK IN button and fires onClockIn', async () => {
		const onClockIn = vi.fn();
		render(<Landing onClockIn={onClockIn} />);
		const btn = await screen.findByTestId('clock-in');
		expect(btn).toBeTruthy();
		btn.click();
		expect(onClockIn).toHaveBeenCalledOnce();
	});

	it('button label reads CLOCK IN when last_floor is 1 or unset', async () => {
		render(<Landing onClockIn={() => {}} />);
		const btn = await screen.findByTestId('clock-in');
		await waitFor(() => expect(btn.textContent).toMatch(/CLOCK IN/));
	});

	it('button label reads RESUME ON FLOOR N when last_floor > 1', async () => {
		memory.set('last_floor', '4');
		render(<Landing onClockIn={() => {}} />);
		const btn = await screen.findByTestId('clock-in');
		await waitFor(() => expect(btn.textContent).toMatch(/RESUME ON FLOOR 4/));
	});
});
