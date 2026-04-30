import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';

type Stats = {
	calls: number;
	triangles: number;
	geometries: number;
	textures: number;
};

const REFRESH_HZ = 4;

/**
 * Mid-frame draw-call counter, mounted under `?debug=draws` (gated by
 * the parent — this component just renders the overlay).
 *
 * Spec §12: alpha mobile target ≤ 250 draws mid-floor. The HUD is the
 * primary instrument for catching regressions before they ship.
 *
 * Sampled at 4Hz, not per-frame: per-frame React state churn would
 * dominate the very metric we're trying to measure. The renderer keeps
 * `gl.info.render.calls` cumulative-per-frame anyway, so any sampling
 * cadence reads the most recent frame's draw count.
 */
export function DrawCallHUD() {
	const [stats, setStats] = useState<Stats>({ calls: 0, triangles: 0, geometries: 0, textures: 0 });
	const lastSample = useRef(0);

	useFrame((state) => {
		const now = state.clock.elapsedTime;
		if (now - lastSample.current < 1 / REFRESH_HZ) return;
		lastSample.current = now;
		const info = state.gl.info;
		setStats({
			calls: info.render.calls,
			triangles: info.render.triangles,
			geometries: info.memory.geometries,
			textures: info.memory.textures,
		});
	});

	return (
		<Html
			position={[0, 0, 0]}
			calculatePosition={() => [10, 10, 0]}
			style={{ pointerEvents: 'none' }}
			zIndexRange={[1000, 1001]}
		>
			<div
				data-testid="draw-call-hud"
				style={{
					padding: '4px 8px',
					background: 'rgba(0,0,0,0.6)',
					color: '#7CFFB8',
					font: '12px ui-monospace, monospace',
					whiteSpace: 'pre',
					borderRadius: 3,
				}}
			>
				draws: {stats.calls.toString().padStart(3)}
				{'\n'}tris : {stats.triangles}
				{'\n'}geom : {stats.geometries}
				{'\n'}tex : {stats.textures}
			</div>
		</Html>
	);
}

/** URL-flag reader: `?debug=draws` or `?debug=*`. */
export function useDrawCallHUDFlag(): boolean {
	const [enabled, setEnabled] = useState(() => readFlag());
	useEffect(() => {
		const onChange = () => setEnabled(readFlag());
		window.addEventListener('popstate', onChange);
		return () => window.removeEventListener('popstate', onChange);
	}, []);
	return enabled;
}

function readFlag(): boolean {
	if (typeof window === 'undefined') return false;
	const flag = new URL(window.location.href).searchParams.get('debug');
	return flag === 'draws' || flag === '*';
}
