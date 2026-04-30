import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Landing } from './Landing';

describe('Landing', () => {
	it('renders CLOCK IN button and fires onClockIn', () => {
		const onClockIn = vi.fn();
		render(<Landing onClockIn={onClockIn} />);
		const btn = screen.getByTestId('clock-in');
		expect(btn).toBeTruthy();
		btn.click();
		expect(onClockIn).toHaveBeenCalledOnce();
	});
});
