import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const registerFacilityMock = vi.fn();
const registerFacilityWithGoogleMock = vi.fn();
const signInWithGoogleMock = vi.fn();

vi.mock('../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../services/auth', () => ({
  registerFacility: (...args) => registerFacilityMock(...args),
  registerFacilityWithGoogle: (...args) => registerFacilityWithGoogleMock(...args),
  signInWithGoogle: (...args) => signInWithGoogleMock(...args),
}));

const { default: RegisterFacilityPage } = await import('./RegisterFacilityPage');

beforeEach(() => {
  useAuthMock.mockReset();
  registerFacilityMock.mockReset();
  registerFacilityWithGoogleMock.mockReset();
  signInWithGoogleMock.mockReset();
  useAuthMock.mockReturnValue({ user: null, role: null, loading: false });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register/facility']}>
      <Routes>
        <Route path="/register/facility" element={<RegisterFacilityPage />} />
        <Route path="/facility/dashboard" element={<p>Facility dashboard</p>} />
        <Route path="/donor/dashboard" element={<p>Donor dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegisterFacilityPage — email/password', () => {
  it('submits the form and navigates to the facility dashboard on success', async () => {
    registerFacilityMock.mockResolvedValue({ uid: 'u1' });
    renderPage();

    await userEvent.type(screen.getByLabelText(/facility name/i), 'Nairobi Hospital');
    await userEvent.type(screen.getByLabelText(/email/i), 'hosp@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'TestPass123!');
    await userEvent.selectOptions(screen.getByLabelText(/facility type/i), 'Hospital');
    await userEvent.selectOptions(screen.getByLabelText(/physical address/i), 'Nairobi');
    await userEvent.click(screen.getByLabelText(/^mon$/i));
    await userEvent.click(screen.getByLabelText(/^tue$/i));
    await userEvent.type(screen.getByLabelText(/opens/i), '08:00');
    await userEvent.type(screen.getByLabelText(/closes/i), '18:00');
    await userEvent.type(screen.getByLabelText(/contact information/i), '0700000000');
    await userEvent.click(screen.getByRole('button', { name: /create facility account/i }));

    expect(registerFacilityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityName: 'Nairobi Hospital',
        email: 'hosp@example.com',
        password: 'TestPass123!',
        facilityType: 'Hospital',
        address: 'Nairobi',
        availableHours: 'Mon, Tue · 08:00–18:00',
        contactInfo: '0700000000',
      }),
    );
    await waitFor(() => expect(screen.getByText('Facility dashboard')).toBeInTheDocument());
  });

  it('shows the service error message when registration fails', async () => {
    registerFacilityMock.mockRejectedValue(new Error('All fields are required to create a facility account.'));
    renderPage();

    await userEvent.type(screen.getByLabelText(/facility name/i), 'Nairobi Hospital');
    await userEvent.type(screen.getByLabelText(/email/i), 'hosp@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'TestPass123!');
    await userEvent.selectOptions(screen.getByLabelText(/facility type/i), 'Hospital');
    await userEvent.selectOptions(screen.getByLabelText(/physical address/i), 'Nairobi');
    await userEvent.click(screen.getByLabelText(/^mon$/i));
    await userEvent.type(screen.getByLabelText(/opens/i), '08:00');
    await userEvent.type(screen.getByLabelText(/closes/i), '18:00');
    await userEvent.type(screen.getByLabelText(/contact information/i), '0700000000');
    await userEvent.click(screen.getByRole('button', { name: /create facility account/i }));

    await waitFor(() => {
      expect(screen.getByText('All fields are required to create a facility account.')).toBeInTheDocument();
    });
  });
});

describe('RegisterFacilityPage — Google', () => {
  it('redirects an already-registered user straight to their dashboard', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'u1' }, role: 'facility', loading: false });
    renderPage();
    expect(screen.getByText('Facility dashboard')).toBeInTheDocument();
  });

  it('starts the Google popup when "Continue with Google" is clicked', async () => {
    signInWithGoogleMock.mockResolvedValue({ uid: 'u1' });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(signInWithGoogleMock).toHaveBeenCalled();
  });

  it('shows the remaining-fields form (no password) once a Google account has no profile yet', async () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'u1', email: 'admin@hosp.example', displayName: 'Nairobi Hospital' },
      role: null,
      loading: false,
    });
    renderPage();

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByText('admin@hosp.example')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/facility type/i), 'Hospital');
    await userEvent.selectOptions(screen.getByLabelText(/physical address/i), 'Nairobi');
    await userEvent.click(screen.getByLabelText(/^mon$/i));
    await userEvent.type(screen.getByLabelText(/opens/i), '08:00');
    await userEvent.type(screen.getByLabelText(/closes/i), '18:00');
    await userEvent.type(screen.getByLabelText(/contact information/i), '0700000000');
    await userEvent.click(screen.getByRole('button', { name: /create facility account/i }));

    await waitFor(() => {
      expect(registerFacilityWithGoogleMock).toHaveBeenCalledWith(
        { uid: 'u1', email: 'admin@hosp.example', displayName: 'Nairobi Hospital' },
        {
          facilityName: 'Nairobi Hospital',
          facilityType: 'Hospital',
          address: 'Nairobi',
          availableHours: 'Mon · 08:00–18:00',
          contactInfo: '0700000000',
        },
      );
    });
  });
});
