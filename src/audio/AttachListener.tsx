import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { globalAudio } from './GlobalAudio';

/**
 * Mounts the GlobalAudio AudioListener on the active R3F camera
 * (PRQ-15 M2c7). Use as `<AttachListener />` inside a `<Canvas>` —
 * `useThree` resolves the active camera; the listener is added as a
 * child so all PositionalAudio sources hear from the player's POV.
 *
 * Idempotent: removing + re-adding is safe (THREE handles parent
 * swap). Dispose detaches on unmount so a future camera-swap doesn't
 * leave dangling listeners.
 */
export function AttachListener() {
	const { camera } = useThree();
	useEffect(() => {
		const listener = globalAudio.getListener();
		camera.add(listener);
		return () => {
			camera.remove(listener);
		};
	}, [camera]);
	return null;
}
