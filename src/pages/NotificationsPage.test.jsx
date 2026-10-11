import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const listenRecipientNotificationsMock = vi.fn();
const markNotificationReadMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../services/notifications', () => ({
  listenRecipientNotifications: (...args) => listenRecipientNotificationsMock(...args),
  markNotificationRead: (...args) => markNotificationReadMock(...args),
}));

const { default: NotificationsPage } = await import('./NotificationsPage');

beforeEach(() => {
  listenRecipientNotificationsMock.mockReset();
  markNotificationReadMock.mockClear();
  listenRecipientNotificationsMock.mockReturnValue(vi.fn());
  useAuthMock.mockReturnValue({ user: { uid: 'd1' } });
});

describe('NotificationsPage', () => {
  it('shows an empty state with no notifications', () => {
    render(<NotificationsPage />);
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it('lists notifications, newest first as returned by the service', () => {
    listenRecipientNotificationsMock.mockImplementation((_id, onChange) => {
      onChange([{ id: 'n1', message: 'Urgent appeal: Hosp needs O- blood.', read: true }]);
      return vi.fn();
    });
    render(<NotificationsPage />);
    expect(screen.getByText('Urgent appeal: Hosp needs O- blood.')).toBeInTheDocument();
  });

  it('marks unread notifications as read once loaded', () => {
    listenRecipientNotificationsMock.mockImplementation((_id, onChange) => {
      onChange([{ id: 'n1', message: 'New appeal near you', read: false }]);
      return vi.fn();
    });
    render(<NotificationsPage />);
    expect(markNotificationReadMock).toHaveBeenCalledWith('n1');
  });
});
