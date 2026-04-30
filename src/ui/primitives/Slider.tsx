import * as SliderPrimitive from '@radix-ui/react-slider';
import type { ComponentProps } from 'react';

/**
 * Brand Slider (PRQ-14 T3). Hairline track + paper-square thumb.
 * Use for volume / sensitivity sliders in PauseMenu Settings tab.
 */
export function Slider({ style, ...rest }: ComponentProps<typeof SliderPrimitive.Root>) {
	return (
		<SliderPrimitive.Root
			style={{
				position: 'relative',
				display: 'flex',
				alignItems: 'center',
				userSelect: 'none',
				touchAction: 'none',
				width: '100%',
				height: 24,
				...style,
			}}
			{...rest}
		>
			<SliderPrimitive.Track
				style={{
					background: 'var(--carpet)',
					position: 'relative',
					flexGrow: 1,
					height: 1,
				}}
			>
				<SliderPrimitive.Range
					style={{
						position: 'absolute',
						background: 'var(--paper)',
						height: '100%',
					}}
				/>
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb
				style={{
					display: 'block',
					width: 14,
					height: 14,
					background: 'var(--paper)',
					border: '1px solid var(--ink)',
					boxShadow: 'var(--shadow-paper-drop)',
					cursor: 'pointer',
				}}
			/>
		</SliderPrimitive.Root>
	);
}
