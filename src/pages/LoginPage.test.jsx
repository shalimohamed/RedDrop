import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginMock = vi.fn();
const signInWithGoogleMock = vi.fn();
const hasUserRecordMock = vi.fn();
vi.mock('../services/auth', () => ({
  login: (...args) => loginMock(...args),
  signInWithGoogle: (...args) => signInWithGoogleMock(...args),
  hasUserRecord: (...args) => hasUserRecordMock(...args),
}));

const { default: LoginPage } = await import('./LoginPage');

beforeEach(() => {
  loginMock.mockReset();
  signInWithGoogleMock.mockReset();
  hasUserRecordMock.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('logs in and navigates to / on success', async () => {
    loginMock.mockResolvedValue({ uid: 'u1' });
    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'TestPass123!');
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));

    expect(loginMock).toHaveBeenCalledWith('jane@example.com', 'TestPass123!');
    await waitFor(() => expect(screen.getByText('Home page')).toBeInTheDocument());
  });

  it('shows a generic error on failed login without leaking the raw error', async () => {
    loginMock.mockRejectedValue(new Error('Firebase: auth/invalid-credential'));
    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));

    await waitFor(() => {
      expect(screen.getByText('Incorrect email or password.')).toBeInTheDocument();
    });
    expect(screen.queryByText(/auth\/invalid-credential/)).not.toBeInTheDocument();
  });

  it('links to the registration flow', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register');
  });

  it('navigates home after Google sign-in for an already-registered account', async () => {
    signInWithGoogleMock.mockResolvedValue({ uid: 'u1' });
    hasUserRecordMock.mockResolvedValue(true);
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(signInWithGoogleMock).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Home page')).toBeInTheDocument());
  });
});
