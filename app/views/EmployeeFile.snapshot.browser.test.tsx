import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EmployeeFile } from './EmployeeFile';

describe('EmployeeFile — M2c6 saves browser', () => {
	afterEach(() => cleanup());

	it('renders empty state when save is null', async () => {
		render(<EmployeeFile save={null} onResume={() => {}} onNewGame={() => {}} onBack={() => {}} />);
		const root = await screen.findByTestId('employee-file');
		expect(root.textContent).toMatch(/No active record/);
		expect(screen.queryByTestId('resume')).toBeNull();
		expect(await screen.findByTestId('new-game')).toBeTruthy();
		expect(await screen.findByTestId('back')).toBeTruthy();
	});

	it('renders stats grid when save is present', async () => {
		const save = {
			floor: 3,
			kills: 12,
			playedSeconds: 304,
			threat: 4.2,
			deaths: 1,
		};
		render(<EmployeeFile save={save} onResume={() => {}} onNewGame={() => {}} onBack={() => {}} />);
		const stats = await screen.findByTestId('save-stats');
		expect(stats.textContent).toMatch(/FLOOR/);
		expect(stats.textContent).toMatch(/3/);
		expect(stats.textContent).toMatch(/4\.2/);
		expect(stats.textContent).toMatch(/5:04/); // 304s = 5:04
		expect(await screen.findByTestId('resume')).toBeTruthy();
	});
});
