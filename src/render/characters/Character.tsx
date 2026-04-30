import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { clone as cloneSkeletal } from 'three/addons/utils/SkeletonUtils.js';
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
	// SkeletonUtils.clone correctly rebinds skeletons for skinned meshes
	// (plain Object3D.clone leaves bone references pointing at the source);
	// it falls through to a normal deep clone for non-skinned scenes.
	// Shadow setup happens inside useMemo so the traversal runs once per
	// scene clone, not on every render.
	const cloned = useMemo(() => {
		const c = cloneSkeletal(scene);
		c.traverse((obj: { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean }) => {
			if (obj.isMesh) {
				obj.castShadow = true;
				obj.receiveShadow = true;
			}
		});
		return c;
	}, [scene]);
	// Manifest anchor offsets the model so its foot lands at `position` even
	// when the source GLB pivot sits at hip or head height. Added as a child
	// group so we don't mutate the cloned scene's transform on each render.
	const ax = entry.anchor[0];
	const ay = entry.anchor[1];
	const az = entry.anchor[2];
	return (
		<group position={position} rotation={[0, rotationY, 0]} scale={entry.scale}>
			<primitive object={cloned} position={[ax, ay, az]} />
		</group>
	);
}
