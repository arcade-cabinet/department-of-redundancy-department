import { Canvas, useThree } from '@react-three/fiber';
import { render } from '@testing-library/react';
import { useEffect } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { describe, expect, it } from 'vitest';
import { Lighting } from './Lighting';

function ToneProbe({
	onReady,
}: {
	onReady: (gl: { toneMapping: number; outputColorSpace: string }) => void;
}) {
	const { gl } = useThree();
	useEffect(() => {
		onReady({ toneMapping: gl.toneMapping, outputColorSpace: gl.outputColorSpace });
	}, [gl, onReady]);
	return null;
}

describe('Lighting', () => {
	it('configures ACESFilmic tonemap + sRGB output on the renderer', async () => {
		let snapshot: { toneMapping: number; outputColorSpace: string } | null = null;
		const { unmount } = render(
			<Canvas>
				<Lighting />
				<ToneProbe onReady={(s) => (snapshot = s)} />
			</Canvas>,
		);
		const deadline = Date.now() + 3_000;
		while (snapshot === null && Date.now() < deadline) {
			await new Promise((r) => setTimeout(r, 50));
		}
		unmount();
		expect(snapshot).not.toBeNull();
		expect((snapshot as unknown as { toneMapping: number }).toneMapping).toBe(
			ACESFilmicToneMapping,
		);
		expect((snapshot as unknown as { outputColorSpace: string }).outputColorSpace).toBe(
			SRGBColorSpace,
		);
	});
});
