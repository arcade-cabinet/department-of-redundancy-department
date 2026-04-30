import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Lighting } from '@/render/lighting/Lighting';

type Props = { onExit: () => void };

export function Game({ onExit }: Props) {
	return (
		<div data-testid="game" style={{ position: 'relative', width: '100%', height: '100%' }}>
			<Canvas
				style={{ background: 'var(--carpet)' }}
				camera={{ position: [0, 1.6, 3], fov: 70 }}
				shadows
				gl={{
					toneMapping: ACESFilmicToneMapping,
					toneMappingExposure: 1.0,
					outputColorSpace: SRGBColorSpace,
					antialias: true,
				}}
			>
				<Lighting />
				<mesh position={[0, 0, 0]} castShadow receiveShadow>
					<boxGeometry args={[1, 1, 1]} />
					<meshStandardMaterial color="#C7B89A" />
				</mesh>
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
