import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { loadManifest, type Manifest } from '@/content/manifest';
import { PlayerCamera } from '@/render/camera/PlayerCamera';
import { Lighting } from '@/render/lighting/Lighting';
import { World } from '@/render/world/World';
import { DrawCallHUD, useDrawCallHUDFlag } from '@/verify/DrawCallHUD';
import { freshSeed } from '@/world/generator/rng';

type Props = { onExit: () => void };

export function Game({ onExit }: Props) {
	const [manifest, setManifest] = useState<Manifest | null>(null);
	const [manifestError, setManifestError] = useState<string | null>(null);
	const showHUD = useDrawCallHUDFlag();
	// Per spec §8.5: world_seed lives in @capacitor/preferences. PRQ-04 wires
	// the persisted seed. For PRQ-02 we use a stable demo seed so the camera
	// position can be hand-aligned to a known-open cubicle; freshSeed() is
	// kept available for the new-game path that PRQ-04 will own.
	void freshSeed; // silence unused — wired in PRQ-04
	const [seed] = useState<string>(() => 'Synergistic Bureaucratic Cubicle');
	useEffect(() => {
		loadManifest()
			.then((m) => {
				setManifest(m);
				setManifestError(null);
			})
			.catch((e: unknown) => {
				const msg = e instanceof Error ? e.message : String(e);
				console.error('manifest load:', msg);
				setManifestError(msg);
			});
	}, []);

	if (manifestError) {
		return (
			<div
				data-testid="game-error"
				role="alert"
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '1rem',
					padding: '2rem',
					background: 'var(--ink, #0d0f12)',
					color: 'var(--paper, #e8e6df)',
					fontFamily: 'inherit',
					textAlign: 'center',
				}}
			>
				<h2 style={{ margin: 0 }}>Failed to load asset manifest</h2>
				<pre style={{ maxWidth: '60ch', whiteSpace: 'pre-wrap', opacity: 0.8 }}>
					{manifestError}
				</pre>
				<button
					type="button"
					onClick={onExit}
					style={{
						padding: '0.5rem 1rem',
						background: 'transparent',
						color: 'inherit',
						border: '1px solid currentColor',
						fontFamily: 'inherit',
						cursor: 'pointer',
					}}
				>
					BACK TO LANDING
				</button>
			</div>
		);
	}

	return (
		<div data-testid="game" style={{ position: 'relative', width: '100%', height: '100%' }}>
			<Canvas
				style={{ background: '#0d0f12' }}
				shadows
				gl={{
					toneMapping: ACESFilmicToneMapping,
					toneMappingExposure: 1.0,
					outputColorSpace: SRGBColorSpace,
					antialias: true,
				}}
			>
				{/* Voxel floor surface sits at world y=0.8 (2 carpet voxels × 0.4u);
				    eye height 1.6 above feet → camera y=2.4. Position offset on z
				    so the player starts a step back from the manager at the cubicle
				    center, looking at them (yaw=π faces -Z which the scene faces by
				    default, so PI looks back along +Z toward the manager). */}
				<PlayerCamera
					position={[0, 1.5]}
					yaw={Math.PI}
					pitch={0}
					eyeHeight={2.4}
					referenceFovDeg={70}
				/>
				<Suspense fallback={null}>
					<Lighting />
					{manifest && <World manifest={manifest} seed={seed} />}
					{showHUD && <DrawCallHUD />}
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
