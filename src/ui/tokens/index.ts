export const tokens = {
	color: {
		ink: '#15181C',
		paper: '#F4F1EA',
		carpet: '#5C6670',
		ceilingTile: '#E2DFD6',
		laminate: '#C7B89A',
		fluorescent: '#E8ECEE',
		auditorRed: '#B33A3A',
		approvalGreen: '#3F8E5A',
		terminalAmber: '#E0A33C',
		tonerCyan: '#2EA8C9',
	},
	font: {
		display: '"Departure Mono", ui-monospace, monospace',
		body: 'Inter, system-ui, -apple-system, sans-serif',
		mono: '"JetBrains Mono", ui-monospace, monospace',
	},
} as const;

export type Tokens = typeof tokens;
