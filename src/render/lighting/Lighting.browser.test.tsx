import { Canvas, useThree } from '@react-three/fiber';
import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { describe, expect, it } from 'vitest';
import { Lighting } from './Lighting';

type SceneSnapshot = {
	toneMapping: number;
	toneMappingExposure: number;
	outputColorSpace: string;
	hasFog: boolean;
};

function SceneProbe({ onReady }: { onReady: (s: SceneSnapshot) => void }) {
	const { gl, scene } = useThree();
	useEffect(() => {
		onReady({
			toneMapping: gl.toneMapping,
			toneMappingExposure: gl.toneMappingExposure,
			outputColorSpace: gl.outputColorSpace,
			hasFog: scene.fog !== null,
		});
	}, [gl, scene, onReady]);
	return null;
}

describe('Lighting', () => {
	it('renders under a Canvas with ACESFilmic + sRGB + no fog (locked spec §6)', async () => {
		let snapshot: SceneSnapshot | null = null;
		const { unmount } = render(
			<Canvas
				gl={{
					toneMapping: ACESFilmicToneMapping,
					toneMappingExposure: 1.0,
					outputColorSpace: SRGBColorSpace,
				}}
			>
				<Lighting />
				<SceneProbe
					onReady={(s) => {
						snapshot = s;
					}}
				/>
			</Canvas>,
		);
		await waitFor(() => expect(snapshot).not.toBeNull(), { timeout: 5000 });
		unmount();

		const s = snapshot as SceneSnapshot | null;
		expect(s).not.toBeNull();
		// biome-ignore lint/style/noNonNullAssertion: waitFor guarantees non-null
		expect(s!.toneMapping).toBe(ACESFilmicToneMapping);
		// biome-ignore lint/style/noNonNullAssertion: waitFor guarantees non-null
		expect(s!.toneMappingExposure).toBe(1.0);
		// biome-ignore lint/style/noNonNullAssertion: waitFor guarantees non-null
		expect(s!.outputColorSpace).toBe(SRGBColorSpace);
		// biome-ignore lint/style/noNonNullAssertion: waitFor guarantees non-null
		expect(s!.hasFog).toBe(false);
	});
});
