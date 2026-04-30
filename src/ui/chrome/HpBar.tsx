import type { Health } from '@/ecs/components/Health';
import { fractionRemaining } from '@/ecs/components/Health';

type Props = {
	health: Health;
};

/**
 * Bottom-left HP bar. Approval-green fill (PRQ-14 will theme it from
 * the design tokens) shrinks as `current/max` drops; goes red-flash
 * for the brief window after a hit (driven by `damageFlashTimer`).
 *
 * Placeholder visual treatment per spec — PRQ-14 polishes typography,
 * tier-color, etc. The data path is real (Health component is what
 * combat writes to + persistence reads from).
 */
export function HpBar({ health }: Props) {
	const pct = fractionRemaining(health) * 100;
	const flashing = health.damageFlashTimer > 0;
	return (
		<div
			data-testid="hp-bar"
			style={{
				position: 'absolute',
				bottom: 16,
				left: 16,
				width: 200,
				height: 16,
				background: 'var(--paper, #e8e6df)',
				border: '2px solid var(--ink, #0d0f12)',
				zIndex: 5,
				pointerEvents: 'none',
			}}
		>
			<div
				style={{
					height: '100%',
					width: `${pct}%`,
					background: flashing ? 'var(--auditor-red, #E53D3D)' : 'var(--approval-green, #6FA86F)',
					transition: 'width 120ms linear',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					font: '11px ui-monospace, monospace',
					color: 'var(--ink, #0d0f12)',
					mixBlendMode: 'difference',
				}}
			>
				HP {Math.round(health.current)}/{health.max}
			</div>
		</div>
	);
}
