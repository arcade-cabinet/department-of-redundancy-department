import { Game } from '@app/views/Game';
import { Landing } from '@app/views/Landing';
import { useEffect, useState } from 'react';
import { type SafeAreaInsets, safeAreaPadding } from '@/input/mobileUx';

type View = 'landing' | 'game';

/** Read iOS/Android safe-area insets from CSS env(). The DOM probe
 *  sets a div with `padding: env(safe-area-inset-*)` and reads back
 *  the computed pixels. Web returns 0/0/0/0 (no notch). */
function readSafeAreaInsets(): SafeAreaInsets {
	if (typeof document === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
	const probe = document.createElement('div');
	probe.style.cssText =
		'position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);';
	document.body.appendChild(probe);
	const cs = getComputedStyle(probe);
	const insets: SafeAreaInsets = {
		top: parseInt(cs.paddingTop, 10) || 0,
		right: parseInt(cs.paddingRight, 10) || 0,
		bottom: parseInt(cs.paddingBottom, 10) || 0,
		left: parseInt(cs.paddingLeft, 10) || 0,
	};
	document.body.removeChild(probe);
	return insets;
}

export function Routes() {
	const [view, setView] = useState<View>('landing');
	const [insets, setInsets] = useState<SafeAreaInsets>({ top: 0, right: 0, bottom: 0, left: 0 });
	useEffect(() => {
		setInsets(readSafeAreaInsets());
	}, []);
	const padStyle = safeAreaPadding(insets);
	const wrap = { width: '100%', height: '100%', ...padStyle };
	if (view === 'game') {
		return (
			<div style={wrap}>
				<Game onExit={() => setView('landing')} />
			</div>
		);
	}
	return (
		<div style={wrap}>
			<Landing onClockIn={() => setView('game')} />
		</div>
	);
}
