import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { loadManifest, type Manifest } from '@/content/manifest';
import { Lighting } from '@/render/lighting/Lighting';
import { World } from '@/render/world/World';
import { freshSeed } from '@/world/generator/rng';

type Props = { onExit: () => void };

export function Game({ onExit }: Props) {
	const [manifest, setManifest] = useState<Manifest | null>(null);
	// Per spec §8.5: world_seed lives in @capacitor/preferences. PRQ-04 wires
	// the persisted seed; for PRQ-02 we generate a fresh seed each mount.
	const [seed] = useState<string>(() => freshSeed());
	useEffect(() => {
		loadManifest()
			.then(setManifest)
			.catch((e) => console.error('manifest load:', e));
	}, []);

	return (
		<div data-testid="game" style={{ position: 'relative', width: '100%', height: '100%' }}>
			<Canvas
				style={{ background: '#0d0f12' }}
				camera={{ position: [3.5, 1.6, 4.5], fov: 60 }}
				shadows
				gl={{
					toneMapping: ACESFilmicToneMapping,
					toneMappingExposure: 1.0,
					outputColorSpace: SRGBColorSpace,
					antialias: true,
				}}
			>
				<Suspense fallback={null}>
					<Lighting />
					{manifest && <World manifest={manifest} seed={seed} />}
				</Suspense>
			</Canvas>
			<button
				type="button"
				data-testid="exit"
				onClick={onExit}
				style={{
					position: 'absolute',
					top: 16,
					right: 16,
					padding: '0.5rem 1rem',
					background: 'var(--ink)',
					color: 'var(--paper)',
					border: '1px solid var(--paper)',
					fontFamily: 'inherit',
					cursor: 'pointer',
				}}
			>
				EXIT
			</button>
		</div>
	);
}
