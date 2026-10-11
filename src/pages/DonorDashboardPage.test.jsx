import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const setDonorAvailabilityMock = vi.fn().mockResolvedValue(undefined);
const listenDonorResponsesMock = vi.fn();

vi.mock('../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../services/donors', () => ({
  setDonorAvailability: (...args) => setDonorAvailabilityMock(...args),
  saveDonorFcmToken: vi.fn().mockResolvedValue(undefined),
  daysSinceLastDonation: (lastDonationDate) => {
    if (!lastDonationDate) return null;
    return Math.floor((Date.now() - new Date(lastDonationDate).getTime()) / (1000 * 60 * 60 * 24));
  },
}));
vi.mock('../services/notifications', () => ({
  registerForPushNotifications: vi.fn().mockResolvedValue(null),
}));
vi.mock('../services/responses', () => ({
  listenDonorResponses: (...args) => listenDonorResponsesMock(...args),
}));

const { default: DonorDashboardPage } = await import('./DonorDashboardPage');

const baseProfile = {
  fullName: 'Jane Doe',
  bloodType: 'O-',
  location: 'Nairobi',
  totalDonations: 2,
  lastDonationDate: null,
  isAvailable: true,
};

beforeEach(() => {
  setDonorAvailabilityMock.mockClear();
  listenDonorResponsesMock.mockReset();
  listenDonorResponsesMock.mockReturnValue(vi.fn());
});

describe('DonorDashboardPage', () => {
  it('shows a loading state while the profile has not arrived yet', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'd1' }, profile: null });
    render(<DonorDashboardPage />);
    expect(screen.getByText(/loading your dashboard/i)).toBeInTheDocument();
  });

  it('renders donor stats once the profile loads', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'd1' }, profile: baseProfile });
    render(<DonorDashboardPage />);

    expect(screen.getByText('Welcome back, Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('No record yet')).toBeInTheDocument();
    expect(screen.getByText(/available to donate/i)).toBeInTheDocument();
  });

  it('toggles availability when the availability badge is clicked', async () => {
    useAuthMock.mockReturnValue({ user: { uid: 'd1' }, profile: baseProfile });
    render(<DonorDashboardPage />);

    await userEvent.click(screen.getByText(/available to donate/i));
    expect(setDonorAvailabilityMock).toHaveBeenCalledWith('d1', false);
  });

  it('renders the activity chart card', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'd1' }, profile: baseProfile });
    render(<DonorDashboardPage />);
    expect(screen.getByText(/your activity — last 6 months/i)).toBeInTheDocument();
  });
});
