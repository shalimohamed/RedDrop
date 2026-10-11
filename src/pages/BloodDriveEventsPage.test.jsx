import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const listenUpcomingEventsMock = vi.fn();
const createBloodDriveEventMock = vi.fn();

vi.mock('../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../services/events', () => ({
  listenUpcomingEvents: (...args) => listenUpcomingEventsMock(...args),
  createBloodDriveEvent: (...args) => createBloodDriveEventMock(...args),
}));

const { default: BloodDriveEventsPage } = await import('./BloodDriveEventsPage');

const facilityProfile = { facilityName: 'Nairobi Hospital' };

beforeEach(() => {
  useAuthMock.mockReset();
  listenUpcomingEventsMock.mockReset();
  createBloodDriveEventMock.mockReset();
  listenUpcomingEventsMock.mockReturnValue(vi.fn());
  useAuthMock.mockReturnValue({ user: null, role: null, profile: null });
});

describe('BloodDriveEventsPage — public listing', () => {
  it('shows an empty state with no events', () => {
    render(<BloodDriveEventsPage />);
    expect(screen.getByText(/no upcoming blood drives listed yet/i)).toBeInTheDocument();
  });

  it('renders an event with its target blood types', () => {
    listenUpcomingEventsMock.mockImplementation((onChange) => {
      onChange([
        {
          id: 'e1',
          eventName: 'World Blood Donor Day Drive',
          facilityName: 'Nairobi Hospital',
          location: 'Nairobi — Uhuru Park',
          date: '2026-07-14',
          time: '09:00',
          targetBloodTypes: ['O-', 'O+'],
        },
      ]);
      return vi.fn();
    });
    render(<BloodDriveEventsPage />);

    expect(screen.getByText('World Blood Donor Day Drive')).toBeInTheDocument();
    expect(screen.getByText(/Nairobi Hospital · Nairobi — Uhuru Park/)).toBeInTheDocument();
    expect(screen.getByText('O-')).toBeInTheDocument();
    expect(screen.getByText('O+')).toBeInTheDocument();
  });

  it('does not show the posting form for guests', () => {
    render(<BloodDriveEventsPage />);
    expect(screen.queryByText(/list a blood drive event/i)).not.toBeInTheDocument();
  });
});

describe('BloodDriveEventsPage — facility posting', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { uid: 'f1' }, role: 'facility', profile: facilityProfile });
  });

  it('publishes an event with a composed city + exact location', async () => {
    createBloodDriveEventMock.mockResolvedValue({ id: 'e1' });
    render(<BloodDriveEventsPage />);

    await userEvent.type(screen.getByLabelText(/event name/i), 'World Blood Donor Day Drive');
    await userEvent.type(screen.getByLabelText(/^date$/i), '2099-07-14');
    await userEvent.type(screen.getByLabelText(/^time$/i), '09:00');
    await userEvent.selectOptions(screen.getByLabelText(/city \/ county/i), 'Nairobi');
    await userEvent.type(screen.getByLabelText(/exact location/i), 'Uhuru Park');
    await userEvent.click(screen.getByRole('button', { name: 'O-' }));
    await userEvent.click(screen.getByRole('button', { name: 'O+' }));
    await userEvent.click(screen.getByRole('button', { name: /publish event/i }));

    await waitFor(() => {
      expect(createBloodDriveEventMock).toHaveBeenCalledWith({
        facilityId: 'f1',
        facilityName: 'Nairobi Hospital',
        eventName: 'World Blood Donor Day Drive',
        date: '2099-07-14',
        time: '09:00',
        location: 'Nairobi — Uhuru Park',
        targetBloodTypes: ['O-', 'O+'],
        role: 'facility',
      });
    });
    expect(screen.getByText(/event published/i)).toBeInTheDocument();
  });

  it('marks the date field with a min of today so a past date cannot be picked', () => {
    render(<BloodDriveEventsPage />);
    const today = new Date().toISOString().slice(0, 10);
    expect(screen.getByLabelText(/^date$/i)).toHaveAttribute('min', today);
  });

  it('rejects a past date before calling createBloodDriveEvent', async () => {
    render(<BloodDriveEventsPage />);

    await userEvent.type(screen.getByLabelText(/event name/i), 'Old Drive');
    await userEvent.type(screen.getByLabelText(/^date$/i), '2020-01-01');
    await userEvent.type(screen.getByLabelText(/^time$/i), '09:00');
    await userEvent.selectOptions(screen.getByLabelText(/city \/ county/i), 'Nairobi');
    await userEvent.type(screen.getByLabelText(/exact location/i), 'Uhuru Park');
    await userEvent.click(screen.getByRole('button', { name: 'O+' }));
    await userEvent.click(screen.getByRole('button', { name: /publish event/i }));

    expect(createBloodDriveEventMock).not.toHaveBeenCalled();
  });
});
