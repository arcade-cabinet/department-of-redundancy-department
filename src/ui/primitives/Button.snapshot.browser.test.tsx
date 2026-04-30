import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button primitive — M2c5', () => {
	afterEach(() => cleanup());

	it('renders all three variants with distinct background style values', () => {
		// Read the inline-style background directly — the brand CSS vars
		// (--paper, --auditor-red, transparent) live on the style attribute,
		// not the resolved computedStyle (the test env doesn't load
		// app/styles.css).
		render(
			<>
				<Button variant="paper" data-testid="b-paper">
					Paper
				</Button>
				<Button variant="auditor" data-testid="b-auditor">
					Auditor
				</Button>
				<Button variant="ghost" data-testid="b-ghost">
					Ghost
				</Button>
			</>,
		);
		const paper = screen.getByTestId('b-paper').getAttribute('style') ?? '';
		const auditor = screen.getByTestId('b-auditor').getAttribute('style') ?? '';
		const ghost = screen.getByTestId('b-ghost').getAttribute('style') ?? '';
		expect(paper).toMatch(/--paper/);
		expect(auditor).toMatch(/--auditor-red/);
		expect(ghost).toMatch(/transparent/);
	});

	it('forwards onClick', () => {
		const onClick = vi.fn();
		render(
			<Button onClick={onClick} data-testid="click-me">
				Click
			</Button>,
		);
		const btn = screen.getByTestId('click-me');
		btn.click();
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('defaults to type="button" so it does not submit forms', () => {
		render(<Button data-testid="default-type">X</Button>);
		const btn = screen.getByTestId('default-type') as HTMLButtonElement;
		expect(btn.type).toBe('button');
	});
});
