import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const listenFacilityAppealsMock = vi.fn();

vi.mock('../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../services/appeals', () => ({
  listenFacilityAppeals: (...args) => listenFacilityAppealsMock(...args),
}));
vi.mock('../services/facilities', () => ({
  saveFacilityFcmToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/notifications', () => ({
  registerForPushNotifications: vi.fn().mockResolvedValue(null),
}));
vi.mock('../components/facilities/LocationPicker', () => ({
  default: ({ facilityId }) => <div data-testid="location-picker">picker for {facilityId}</div>,
}));

const { default: FacilityDashboardPage } = await import('./FacilityDashboardPage');

const baseProfile = { facilityName: 'Nairobi Hospital', type: 'Hospital', address: '123 Main St', lat: null, lng: null };

beforeEach(() => {
  listenFacilityAppealsMock.mockReset();
  listenFacilityAppealsMock.mockReturnValue(vi.fn());
  useAuthMock.mockReturnValue({ user: { uid: 'f1' }, role: 'facility', profile: baseProfile });
});

describe('FacilityDashboardPage', () => {
  it('shows a loading state while the profile has not arrived yet', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'f1' }, role: 'facility', profile: null });
    render(<FacilityDashboardPage />);
    expect(screen.getByText(/loading your dashboard/i)).toBeInTheDocument();
  });

  it('renders facility details and the location picker', () => {
    render(<FacilityDashboardPage />);
    expect(screen.getByText('Nairobi Hospital')).toBeInTheDocument();
    expect(screen.getByText(/Hospital · 123 Main St/)).toBeInTheDocument();
    expect(screen.getByTestId('location-picker')).toHaveTextContent('picker for f1');
  });

  it('renders the appeals-by-blood-type chart card', () => {
    render(<FacilityDashboardPage />);
    expect(screen.getByText(/appeals by blood type/i)).toBeInTheDocument();
  });
});
