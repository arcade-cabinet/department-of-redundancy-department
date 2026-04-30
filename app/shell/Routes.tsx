import { useState } from 'react';
import { Game } from '../views/Game';
import { Landing } from '../views/Landing';

type View = 'landing' | 'game';

export function Routes() {
	const [view, setView] = useState<View>('landing');
	if (view === 'game') return <Game onExit={() => setView('landing')} />;
	return <Landing onClockIn={() => setView('game')} />;
}
