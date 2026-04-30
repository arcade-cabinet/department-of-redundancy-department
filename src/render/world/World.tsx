import { Gltf, useGLTF } from '@react-three/drei';
import type { Manifest } from '@/content/manifest';
import { Character } from '@/render/characters/Character';
import { CeilingFixture } from '@/render/lighting/CeilingFixture';
import { DeskLamp } from '@/render/lighting/DeskLamp';
import { Ceiling } from './Ceiling';
import { CubicleBank } from './CubicleBank';
import { Floor } from './Floor';

type Props = {
	manifest: Manifest;
};

const CEILING_HEIGHT = 2.6;

// Pre-fetch the prop GLBs so the demo scene doesn't wait on network.
useGLTF.preload('/assets/models/props/desk.glb');

/**
 * The PRQ-02 demo scene: one cubicle bank in the center of a 16×16 chunk
 * with floor + ceiling + ceiling fixture + desk lamp + a desk + a
 * middle-manager standing in front of the desk. This is the goalpost
 * scene that must visibly exceed `references/poc.html`.
 */
export function World({ manifest }: Props) {
	return (
		<>
			<Floor size={[16, 16]} repeat={4} />
			<Ceiling size={[16, 16]} height={CEILING_HEIGHT} repeat={4} />

			{/* One cubicle bank, centered */}
			<CubicleBank position={[0, 0, 0]} width={2.4} depth={2.4} wallHeight={1.2} />

			{/* One desk inside the bank */}
			<Gltf src="/assets/models/props/desk.glb" position={[0, 0, -0.6]} castShadow receiveShadow />

			{/* Middle manager standing in front of the desk, facing the camera */}
			<Character
				slug="middle-manager"
				manifest={manifest}
				position={[0, 0, 0.5]}
				rotationY={Math.PI}
			/>

			{/* Lighting fixtures */}
			<CeilingFixture
				position={[0, CEILING_HEIGHT - 0.01, 0]}
				width={3.2}
				height={1.0}
				intensity={1.4}
			/>
			<DeskLamp position={[0.5, 0.9, -0.6]} active intensity={0.8} distance={4} />
		</>
	);
}
