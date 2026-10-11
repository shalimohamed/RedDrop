import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Footer from './Footer';

describe('Footer', () => {
  it('renders the brand and academic project line', () => {
    render(<Footer />);
    expect(screen.getByText('RedDrop')).toBeInTheDocument();
    expect(screen.getByText(/SWE3090 academic project/i)).toBeInTheDocument();
  });
});
