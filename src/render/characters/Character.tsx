import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import type { Manifest } from '@/content/manifest';

type Props = {
	/** Manifest slug — e.g. "middle-manager", "policeman", "swat". */
	slug: string;
	/** Pre-loaded manifest (passed down from a parent that has already awaited
	 *  `loadManifest()`). Avoids a per-character fetch race. */
	manifest: Manifest;
	/** World-space position of the character's foot anchor. */
	position?: [number, number, number];
	/** Y-rotation in radians. */
	rotationY?: number;
};

/**
 * Minimal `<Character/>` mount for PRQ-02. Reads the manifest entry, loads
 * the GLB via drei `useGLTF`, clones the scene (so multiple instances of
 * the same slug don't share mutable state), and mounts it as a primitive.
 *
 * Locomotion (hop-walk + state machine + material override system) lands
 * in PRQ-07. For PRQ-02 this just gets a static T-pose into the scene to
 * prove the asset pipeline end-to-end.
 */
export function Character({ slug, manifest, position = [0, 0, 0], rotationY = 0 }: Props) {
	const entry = manifest.characters[slug];
	if (!entry) throw new Error(`Manifest missing character/${slug}`);
	const { scene } = useGLTF(entry.path);
	// Clone so parallel instances don't mutate shared transforms.
	const cloned = useMemo(() => scene.clone(true), [scene]);
	// Cast shadows on every mesh in the cloned tree.
	cloned.traverse((obj) => {
		const m = obj as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
		if (m.isMesh) {
			m.castShadow = true;
			m.receiveShadow = true;
		}
	});
	return (
		<primitive
			object={cloned}
			position={position}
			rotation={[0, rotationY, 0]}
			scale={entry.scale}
		/>
	);
}
