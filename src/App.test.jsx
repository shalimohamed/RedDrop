import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const isFirebaseConfiguredMock = vi.fn();

vi.mock('./firebase/config', () => ({
  get isFirebaseConfigured() {
    return isFirebaseConfiguredMock();
  },
  auth: {},
  db: {},
}));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => { callback(null); return vi.fn(); }),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({ onSnapshot: vi.fn(() => vi.fn()), doc: vi.fn(), getDoc: vi.fn() }));
vi.mock('./services/notifications', () => ({
  listenRecipientNotifications: vi.fn(() => vi.fn()),
  listenForForegroundMessages: vi.fn().mockResolvedValue(vi.fn()),
}));
vi.mock('./pages/LandingPage', () => ({ default: () => <p>Landing stub</p> }));

const { default: App } = await import('./App');

describe('App', () => {
  it('shows the setup-needed page when Firebase is not configured', () => {
    isFirebaseConfiguredMock.mockReturnValue(false);
    render(<App />);
    expect(screen.getByText(/needs a Firebase project to run/i)).toBeInTheDocument();
  });

  it('renders the routed app (not the setup page) when Firebase is configured', () => {
    isFirebaseConfiguredMock.mockReturnValue(true);
    render(<App />);
    expect(screen.queryByText(/needs a Firebase project to run/i)).not.toBeInTheDocument();
    expect(screen.getByText('Landing stub')).toBeInTheDocument();
    expect(screen.getAllByText('RedDrop').length).toBeGreaterThan(0);
  });
});
