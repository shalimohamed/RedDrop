import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Badge from './Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge tone="Urgent">Urgent</Badge>);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('falls back to the Standard style for an unknown tone', () => {
    render(<Badge tone="Nonsense">Whatever</Badge>);
    expect(screen.getByText('Whatever')).toHaveClass('bg-standard-bg');
  });

  it('defaults to Standard tone when none is given', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default')).toHaveClass('bg-standard-bg');
  });

  it('applies the Fulfilled style', () => {
    render(<Badge tone="Fulfilled">Done</Badge>);
    expect(screen.getByText('Done')).toHaveClass('bg-fulfilled-bg');
  });
});
