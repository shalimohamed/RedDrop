import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RegisterChoicePage from './RegisterChoicePage';

describe('RegisterChoicePage', () => {
  it('links to both donor and facility registration', () => {
    render(
      <MemoryRouter>
        <RegisterChoicePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /register as a donor/i })).toHaveAttribute('href', '/register/donor');
    expect(screen.getByRole('link', { name: /register as a facility/i })).toHaveAttribute(
      'href',
      '/register/facility',
    );
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  });
});
