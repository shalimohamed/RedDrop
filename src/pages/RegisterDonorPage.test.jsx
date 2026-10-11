import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const registerDonorMock = vi.fn();
const registerDonorWithGoogleMock = vi.fn();
const signInWithGoogleMock = vi.fn();

vi.mock('../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../services/auth', () => ({
  registerDonor: (...args) => registerDonorMock(...args),
  registerDonorWithGoogle: (...args) => registerDonorWithGoogleMock(...args),
  signInWithGoogle: (...args) => signInWithGoogleMock(...args),
}));

const { default: RegisterDonorPage } = await import('./RegisterDonorPage');

beforeEach(() => {
  useAuthMock.mockReset();
  registerDonorMock.mockReset();
  registerDonorWithGoogleMock.mockReset();
  signInWithGoogleMock.mockReset();
  useAuthMock.mockReturnValue({ user: null, role: null, loading: false });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register/donor']}>
      <Routes>
        <Route path="/register/donor" element={<RegisterDonorPage />} />
        <Route path="/donor/dashboard" element={<p>Donor dashboard</p>} />
        <Route path="/facility/dashboard" element={<p>Facility dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegisterDonorPage — email/password', () => {
  it('submits the form and navigates to the donor dashboard on success', async () => {
    registerDonorMock.mockResolvedValue({ uid: 'u1' });
    renderPage();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'TestPass123!');
    await userEvent.selectOptions(screen.getByLabelText(/blood type/i), 'O-');
    await userEvent.type(screen.getByLabelText(/location/i), 'Westlands, Nairobi');
    await userEvent.type(screen.getByLabelText(/phone number/i), '+254700000000');
    await userEvent.click(screen.getByRole('button', { name: /create donor account/i }));

    expect(registerDonorMock).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'TestPass123!',
      bloodType: 'O-',
      location: 'Westlands, Nairobi',
      phone: '+254700000000',
    });
    await waitFor(() => expect(screen.getByText('Donor dashboard')).toBeInTheDocument());
  });

  it('shows the service error message and stays on the page when registration fails', async () => {
    registerDonorMock.mockRejectedValue(new Error('All fields are required to create a donor account.'));
    renderPage();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'TestPass123!');
    await userEvent.selectOptions(screen.getByLabelText(/blood type/i), 'O-');
    await userEvent.type(screen.getByLabelText(/location/i), 'Nairobi');
    await userEvent.type(screen.getByLabelText(/phone number/i), '+254700000000');
    await userEvent.click(screen.getByRole('button', { name: /create donor account/i }));

    await waitFor(() => {
      expect(screen.getByText('All fields are required to create a donor account.')).toBeInTheDocument();
    });
  });
});

describe('RegisterDonorPage — Google', () => {
  it('redirects an already-registered user straight to their dashboard', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'u1' }, role: 'donor', loading: false });
    renderPage();
    expect(screen.getByText('Donor dashboard')).toBeInTheDocument();
  });

  it('starts the Google popup when "Continue with Google" is clicked', async () => {
    signInWithGoogleMock.mockResolvedValue({ uid: 'u1' });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(signInWithGoogleMock).toHaveBeenCalled();
  });

  it('shows the remaining-fields form (no password) once a Google account has no profile yet', async () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'u1', email: 'jane@gmail.com', displayName: 'Jane Doe' },
      role: null,
      loading: false,
    });
    renderPage();

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByText('jane@gmail.com')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/blood type/i), 'O-');
    await userEvent.type(screen.getByLabelText(/location/i), 'Nairobi');
    await userEvent.type(screen.getByLabelText(/phone number/i), '+254700000000');
    await userEvent.click(screen.getByRole('button', { name: /create donor account/i }));

    await waitFor(() => {
      expect(registerDonorWithGoogleMock).toHaveBeenCalledWith(
        { uid: 'u1', email: 'jane@gmail.com', displayName: 'Jane Doe' },
        { fullName: 'Jane Doe', bloodType: 'O-', location: 'Nairobi', phone: '+254700000000' },
      );
    });
  });
});
