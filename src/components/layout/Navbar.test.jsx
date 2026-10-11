import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const logoutMock = vi.fn().mockResolvedValue(undefined);
const navigateMock = vi.fn();
const listenRecipientNotificationsMock = vi.fn();

vi.mock('../../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../../services/auth', () => ({ logout: (...args) => logoutMock(...args) }));
vi.mock('../../services/notifications', () => ({
  listenRecipientNotifications: (...args) => listenRecipientNotificationsMock(...args),
}));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

const { default: Navbar } = await import('./Navbar');

beforeEach(() => {
  logoutMock.mockClear();
  navigateMock.mockClear();
  listenRecipientNotificationsMock.mockReset();
  listenRecipientNotificationsMock.mockReturnValue(vi.fn());
});

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

describe('Navbar', () => {
  it('shows Log in / Register for a guest', () => {
    useAuthMock.mockReturnValue({ user: null, role: null, profile: null });
    renderNavbar();

    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register');
    expect(screen.queryByText(/log out/i)).not.toBeInTheDocument();
  });

  it('shows the donor dashboard link and Log out for a signed-in donor', () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'd1' },
      role: 'donor',
      profile: { fullName: 'Jane Doe' },
    });
    renderNavbar();

    const dashboardLink = screen.getByRole('link', { name: 'Jane Doe' });
    expect(dashboardLink).toHaveAttribute('href', '/donor/dashboard');
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('links a signed-in facility to the facility dashboard', () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'f1' },
      role: 'facility',
      profile: { facilityName: 'Nairobi Hospital' },
    });
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Nairobi Hospital' })).toHaveAttribute('href', '/facility/dashboard');
  });

  it('logs out and navigates home when Log out is clicked', async () => {
    useAuthMock.mockReturnValue({ user: { uid: 'd1' }, role: 'donor', profile: { fullName: 'Jane Doe' } });
    renderNavbar();

    await userEvent.click(screen.getByRole('button', { name: /log out/i }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('shows a bell link to /notifications for a signed-in user, with no badge when nothing is unread', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'd1' }, role: 'donor', profile: { fullName: 'Jane Doe' } });
    listenRecipientNotificationsMock.mockImplementation((_id, onChange) => {
      onChange([{ id: 'n1', read: true }]);
      return vi.fn();
    });
    renderNavbar();

    expect(screen.getByRole('link', { name: /notifications/i })).toHaveAttribute('href', '/notifications');
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows an unread count badge on the bell', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'd1' }, role: 'donor', profile: { fullName: 'Jane Doe' } });
    listenRecipientNotificationsMock.mockImplementation((_id, onChange) => {
      onChange([{ id: 'n1', read: false }, { id: 'n2', read: false }]);
      return vi.fn();
    });
    renderNavbar();

    expect(screen.getByRole('link', { name: /notifications \(2 unread\)/i })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('reveals the public links in a mobile menu when the hamburger is toggled, and hides them again', async () => {
    useAuthMock.mockReturnValue({ user: null, role: null, profile: null });
    renderNavbar();

    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /open menu/i }));
    const mobileMenu = screen.getByTestId('mobile-menu');
    expect(within(mobileMenu).getByRole('link', { name: 'Blood Drives' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close menu/i }));
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
  });

  it('closes the mobile menu after clicking one of its links', async () => {
    useAuthMock.mockReturnValue({ user: null, role: null, profile: null });
    renderNavbar();

    await userEvent.click(screen.getByRole('button', { name: /open menu/i }));
    const mobileMenu = screen.getByTestId('mobile-menu');
    await userEvent.click(within(mobileMenu).getByRole('link', { name: 'Blood Appeals' }));

    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
  });

  it('includes the dashboard link in the mobile menu for a signed-in user', async () => {
    useAuthMock.mockReturnValue({ user: { uid: 'd1' }, role: 'donor', profile: { fullName: 'Jane Doe' } });
    renderNavbar();

    await userEvent.click(screen.getByRole('button', { name: /open menu/i }));
    const mobileMenu = screen.getByTestId('mobile-menu');
    const dashboardLink = within(mobileMenu).getByRole('link', { name: 'Jane Doe' });
    expect(dashboardLink).toHaveAttribute('href', '/donor/dashboard');

    await userEvent.click(dashboardLink);
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
  });

  it('does not include a dashboard link in the mobile menu for a guest', async () => {
    useAuthMock.mockReturnValue({ user: null, role: null, profile: null });
    renderNavbar();

    await userEvent.click(screen.getByRole('button', { name: /open menu/i }));
    const mobileMenu = screen.getByTestId('mobile-menu');
    expect(within(mobileMenu).queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
