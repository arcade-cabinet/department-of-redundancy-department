import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

/**
 * Perf probe (PRQ-18 M3c2). Mounts inside the Canvas as a hidden node
 * and writes the renderer's draw-call count to `window.__dord.perf`
 * each frame so the e2e perf spec can assert spec §12 budgets.
 *
 * Gated on ?test=1 like the rest of the __dord namespace; production
 * builds skip the per-frame hop.
 */

interface PerfSnapshot {
	calls: number;
	triangles: number;
	geometries: number;
	textures: number;
	frameMs: number;
}

let _enabled: boolean | null = null;
function isEnabled(): boolean {
	if (_enabled !== null) return _enabled;
	if (typeof window === 'undefined') {
		_enabled = false;
		return false;
	}
	_enabled = new URLSearchParams(window.location.search).get('test') === '1';
	return _enabled;
}

export function PerfProbe() {
	const { gl } = useThree();
	const lastFrameAt = useRef(performance.now());

	useEffect(() => {
		if (!isEnabled()) return;
		const w = window as unknown as { __dord?: { perf?: () => PerfSnapshot } };
		w.__dord = w.__dord ?? {};
		(w.__dord as { perf?: () => PerfSnapshot }).perf = () => ({
			calls: gl.info.render.calls,
			triangles: gl.info.render.triangles,
			geometries: gl.info.memory.geometries,
			textures: gl.info.memory.textures,
			frameMs: performance.now() - lastFrameAt.current,
		});
	}, [gl]);

	useFrame(() => {
		lastFrameAt.current = performance.now();
	});

	return null;
}
