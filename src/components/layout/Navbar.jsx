import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/auth';
import { listenRecipientNotifications } from '../../services/notifications';
import Button from '../common/Button';

const PUBLIC_LINKS = [
  { to: '/appeals', label: 'Blood Appeals' },
  { to: '/drives', label: 'Blood Drives' },
  { to: '/facilities', label: 'Find Facilities' },
];

export default function Navbar() {
  const { user, role, profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    return listenRecipientNotifications(user.uid, setNotifications, { limitTo: 50 });
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-blood-900 shadow-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-xl font-semibold text-white">
          RedDrop
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {PUBLIC_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium text-white/85 hover:text-white ${isActive ? 'text-white underline underline-offset-4' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!user && (
            <>
              <Button as={Link} to="/login" variant="outlineOnDark">
                Log in
              </Button>
              <Button as={Link} to="/register" variant="ghost">
                Register
              </Button>
            </>
          )}

          {user && (
            <>
              <Link
                to={role === 'facility' ? '/facility/dashboard' : '/donor/dashboard'}
                className="hidden text-sm font-medium text-white/90 hover:text-white sm:inline"
              >
                {profile?.fullName || profile?.facilityName || 'Dashboard'}
              </Link>
              <Button variant="outlineOnDark" onClick={handleLogout}>
                Log out
              </Button>
              <Link
                to="/notifications"
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-white/85 hover:bg-white/10 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 2.5h15L18 16Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 20.5a2.5 2.5 0 0 0 5 0"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-blood-500 px-1 text-[10px] font-semibold leading-none text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/85 hover:bg-white/10 hover:text-white md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div data-testid="mobile-menu" className="border-t border-white/10 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {user && (
              <Link
                to={role === 'facility' ? '/facility/dashboard' : '/donor/dashboard'}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-white/90 hover:text-white"
              >
                {profile?.fullName || profile?.facilityName || 'Dashboard'}
              </Link>
            )}
            {PUBLIC_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `text-sm font-medium text-white/85 hover:text-white ${isActive ? 'text-white underline underline-offset-4' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
