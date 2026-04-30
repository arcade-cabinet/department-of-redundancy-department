import { Canvas, useThree } from '@react-three/fiber';
import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { ACESFilmicToneMapping, type DirectionalLight, SRGBColorSpace } from 'three';
import { describe, expect, it } from 'vitest';
import { Lighting } from './Lighting';

type SceneSnapshot = {
	toneMapping: number;
	toneMappingExposure: number;
	outputColorSpace: string;
	hasFog: boolean;
	directionalShadow: {
		left: number;
		right: number;
		top: number;
		bottom: number;
		far: number;
	} | null;
};

function SceneProbe({ onReady }: { onReady: (s: SceneSnapshot) => void }) {
	const { gl, scene } = useThree();
	useEffect(() => {
		// Find the first directional light that casts shadow.
		let dirShadow: SceneSnapshot['directionalShadow'] = null;
		scene.traverse((obj) => {
			const l = obj as DirectionalLight;
			if (
				dirShadow === null &&
				(obj as { isDirectionalLight?: boolean }).isDirectionalLight &&
				l.castShadow
			) {
				const cam = l.shadow.camera;
				dirShadow = {
					left: cam.left,
					right: cam.right,
					top: cam.top,
					bottom: cam.bottom,
					far: cam.far,
				};
			}
		});
		onReady({
			toneMapping: gl.toneMapping,
			toneMappingExposure: gl.toneMappingExposure,
			outputColorSpace: gl.outputColorSpace,
			hasFog: scene.fog !== null,
			directionalShadow: dirShadow,
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
		// biome-ignore lint/style/noNonNullAssertion: waitFor guarantees non-null
		const shadow = s!.directionalShadow;
		expect(shadow).not.toBeNull();
		// Shadow frustum spans ≥ ±32u so a full chunk is covered (spec §6).
		// biome-ignore lint/style/noNonNullAssertion: shadow non-null guarded above
		expect(Math.abs(shadow!.left)).toBeGreaterThanOrEqual(32);
		// biome-ignore lint/style/noNonNullAssertion: shadow non-null guarded above
		expect(shadow!.right).toBeGreaterThanOrEqual(32);
		// biome-ignore lint/style/noNonNullAssertion: shadow non-null guarded above
		expect(shadow!.top).toBeGreaterThanOrEqual(32);
		// biome-ignore lint/style/noNonNullAssertion: shadow non-null guarded above
		expect(Math.abs(shadow!.bottom)).toBeGreaterThanOrEqual(32);
	});
});
