import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';

/**
 * Brand Tabs (PRQ-14 T3). Stamped paper trigger row + content panel.
 * Wraps `@radix-ui/react-tabs` with the project's design tokens. Use:
 *
 * ```tsx
 * <Tabs.Root defaultValue="stats">
 *   <Tabs.List>
 *     <Tabs.Trigger value="stats">Stats</Tabs.Trigger>
 *     <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="stats">…</Tabs.Content>
 *   <Tabs.Content value="settings">…</Tabs.Content>
 * </Tabs.Root>
 * ```
 */

function Root(props: ComponentProps<typeof TabsPrimitive.Root>) {
	return <TabsPrimitive.Root {...props} />;
}

function List({ style, ...rest }: ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List
			style={{
				display: 'flex',
				gap: 'var(--space-2)',
				borderBottom: '1px solid var(--paper)',
				paddingBottom: 'var(--space-2)',
				...style,
			}}
			{...rest}
		/>
	);
}

function Trigger({ style, ...rest }: ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			style={{
				background: 'transparent',
				color: 'var(--paper)',
				border: 'none',
				padding: 'var(--space-2) var(--space-4)',
				fontFamily: 'var(--font-display)',
				fontSize: '0.85rem',
				letterSpacing: '0.08em',
				textTransform: 'uppercase',
				cursor: 'pointer',
				borderBottom: '2px solid transparent',
				...style,
			}}
			{...rest}
		/>
	);
}

function Content({ style, ...rest }: ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			style={{
				padding: 'var(--space-4) 0',
				color: 'var(--paper)',
				...style,
			}}
			{...rest}
		/>
	);
}

export const Tabs = { Root, List, Trigger, Content };
