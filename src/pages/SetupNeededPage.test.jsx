import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SetupNeededPage from './SetupNeededPage';

describe('SetupNeededPage', () => {
  it('explains the missing Firebase setup', () => {
    render(<SetupNeededPage />);
    expect(screen.getByText(/needs a Firebase project to run/i)).toBeInTheDocument();
    expect(screen.getByText('.env.local')).toBeInTheDocument();
  });
});
