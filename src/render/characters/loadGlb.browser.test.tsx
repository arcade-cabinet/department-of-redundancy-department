import { useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { render } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';

function GlbProbe({ path, onLoad }: { path: string; onLoad: (vertexCount: number) => void }) {
	const gltf = useGLTF(path);
	let vertexCount = 0;
	gltf.scene.traverse((obj) => {
		// biome-ignore lint/suspicious/noExplicitAny: three.js typed Mesh check
		const m = obj as any;
		if (m.isMesh && m.geometry?.attributes?.position) {
			vertexCount += m.geometry.attributes.position.count;
		}
	});
	if (vertexCount > 0) onLoad(vertexCount);
	return null;
}

describe('GLB load via drei useGLTF', () => {
	it('loads middle-manager.glb and exposes mesh geometry', async () => {
		let vertexCount = 0;
		const { unmount } = render(
			<Canvas>
				<Suspense fallback={null}>
					<GlbProbe
						path="/assets/models/characters/middle-manager.glb"
						onLoad={(n) => {
							vertexCount = n;
						}}
					/>
				</Suspense>
			</Canvas>,
		);

		// The asset is large enough that load takes a few frames; spin until
		// onLoad has fired or the timeout lapses.
		const deadline = Date.now() + 5_000;
		while (vertexCount === 0 && Date.now() < deadline) {
			await new Promise((r) => setTimeout(r, 50));
		}
		unmount();
		expect(vertexCount).toBeGreaterThan(0);
	});
});
