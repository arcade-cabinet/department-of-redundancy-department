import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GameOver } from './GameOver';

describe('GameOver — M2c6 brand surface', () => {
	afterEach(() => cleanup());

	it('renders TERMINATED title + Restart + Quit buttons', async () => {
		render(<GameOver onRestart={() => {}} onExit={() => {}} />);
		const root = await screen.findByTestId('game-over');
		expect(root.textContent).toMatch(/You have been/);
		expect(root.textContent).toMatch(/terminated/i);
		expect(await screen.findByTestId('restart')).toBeTruthy();
		expect(await screen.findByTestId('quit-to-landing')).toBeTruthy();
	});

	it('stats grid renders when stats prop is supplied', async () => {
		render(
			<GameOver
				onRestart={() => {}}
				onExit={() => {}}
				stats={{ kills: 17, deepestFloor: 4, playedSeconds: 192 }}
			/>,
		);
		const stats = await screen.findByTestId('game-over-stats');
		expect(stats.textContent).toMatch(/KILLS/);
		expect(stats.textContent).toMatch(/17/);
		expect(stats.textContent).toMatch(/DEEPEST FLOOR/);
		expect(stats.textContent).toMatch(/4/);
		expect(stats.textContent).toMatch(/3:12/); // 192s = 3:12
	});

	it('omits stats grid when stats prop is undefined', async () => {
		render(<GameOver onRestart={() => {}} onExit={() => {}} />);
		expect(screen.queryByTestId('game-over-stats')).toBeNull();
	});
});
