import { useEffect } from 'react';
import { contrastRatio, meetsWCAG_AA } from '@/ui/a11y/contrast';
import { Routes } from './shell/Routes';

/** Boot-time WCAG 2.1 contrast audit (PRQ-RC1). Reads --paper / --ink
 *  from the document root so tuning the palette is detectable in
 *  production builds via console. Fails open: a missing variable
 *  silently no-ops instead of crashing the app. */
function auditContrast(): void {
	if (typeof document === 'undefined') return;
	const cs = getComputedStyle(document.documentElement);
	const paper = cs.getPropertyValue('--paper').trim();
	const ink = cs.getPropertyValue('--ink').trim();
	if (!paper || !ink) return;
	try {
		const ratio = contrastRatio(paper, ink);
		const ok = meetsWCAG_AA(ratio, 'normal');
		const msg = `[a11y] paper/ink contrast = ${ratio.toFixed(2)}:1 — AA(normal) ${ok ? 'PASS' : 'FAIL'}`;
		if (ok) console.info(msg);
		else console.warn(msg);
	} catch (e) {
		console.warn('[a11y] contrast audit failed:', e);
	}
}

export function App() {
	useEffect(() => {
		auditContrast();
	}, []);
	return <Routes />;
}
