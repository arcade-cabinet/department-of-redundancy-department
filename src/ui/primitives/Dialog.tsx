import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentProps } from 'react';

/**
 * Brand Dialog (PRQ-14 T3). Stamped paper modal with deep shadow
 * + auditor-red dimmed overlay. Use for PauseMenu, GameOver,
 * confirm prompts.
 */

function Root(props: ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root {...props} />;
}

function Trigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger {...props} />;
}

function Portal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal {...props} />;
}

function Overlay({ style, ...rest }: ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(13, 15, 18, 0.78)',
				backdropFilter: 'blur(2px)',
				zIndex: 80,
				...style,
			}}
			{...rest}
		/>
	);
}

function Content({ style, ...rest }: ComponentProps<typeof DialogPrimitive.Content>) {
	return (
		<DialogPrimitive.Content
			style={{
				position: 'fixed',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)',
				background: 'var(--paper)',
				color: 'var(--ink)',
				padding: 'var(--space-6)',
				borderRadius: 'var(--radius-1)',
				boxShadow: 'var(--shadow-deep)',
				minWidth: 360,
				maxWidth: '90vw',
				maxHeight: '90vh',
				overflowY: 'auto',
				zIndex: 90,
				fontFamily: 'var(--font-body)',
				...style,
			}}
			{...rest}
		/>
	);
}

function Title({ style, ...rest }: ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			style={{
				margin: 0,
				marginBottom: 'var(--space-4)',
				fontFamily: 'var(--font-display)',
				fontSize: '1.5rem',
				letterSpacing: '0.08em',
				textTransform: 'uppercase',
				...style,
			}}
			{...rest}
		/>
	);
}

function Description({ style, ...rest }: ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			style={{
				margin: 0,
				marginBottom: 'var(--space-5)',
				opacity: 0.8,
				...style,
			}}
			{...rest}
		/>
	);
}

function Close(props: ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close {...props} />;
}

export const Dialog = {
	Root,
	Trigger,
	Portal,
	Overlay,
	Content,
	Title,
	Description,
	Close,
};
