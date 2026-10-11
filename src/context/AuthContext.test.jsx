import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

let authCallback;
let userDocCallback;
let profileDocCallback;

const onAuthStateChangedMock = vi.fn((_auth, callback) => {
  authCallback = callback;
  return vi.fn();
});

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args) => onAuthStateChangedMock(...args),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, collectionName, id) => `${collectionName}/${id}`),
  onSnapshot: vi.fn((path, callback) => {
    if (path.startsWith('users/')) userDocCallback = callback;
    if (path.startsWith('donors/') || path.startsWith('facilities/')) profileDocCallback = callback;
    return vi.fn();
  }),
}));

vi.mock('../firebase/config', () => ({ auth: {}, db: {} }));
vi.mock('../services/notifications', () => ({
  listenForForegroundMessages: vi.fn().mockResolvedValue(() => {}),
}));

beforeEach(() => {
  authCallback = undefined;
  userDocCallback = undefined;
  profileDocCallback = undefined;
});

function Probe() {
  const { user, role, profile, loading } = useAuth();
  return (
    <p>
      loading:{String(loading)} role:{String(role)} profile:{String(profile?.fullName ?? null)} user:
      {String(user?.uid ?? null)}
    </p>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  it('resolves loading=false immediately for a guest (no signed-in user)', async () => {
    renderProvider();
    act(() => authCallback(null));

    await waitFor(() => {
      expect(screen.getByText(/loading:false/)).toBeInTheDocument();
    });
    expect(screen.getByText(/role:null/)).toBeInTheDocument();
  });

  it('stays loading until BOTH auth resolves AND the role doc arrives (race-condition fix)', async () => {
    renderProvider();

    act(() => authCallback({ uid: 'donor-1' }));
    await waitFor(() => expect(userDocCallback).toBeDefined());

    expect(screen.getByText(/loading:true/)).toBeInTheDocument();

    act(() => userDocCallback({ exists: () => true, data: () => ({ role: 'donor' }) }));

    await waitFor(() => {
      expect(screen.getByText(/loading:false/)).toBeInTheDocument();
    });
    expect(screen.getByText(/role:donor/)).toBeInTheDocument();
  });

  it('loads the donor profile doc once role resolves to donor', async () => {
    renderProvider();
    act(() => authCallback({ uid: 'donor-1' }));
    await waitFor(() => expect(userDocCallback).toBeDefined());
    act(() => userDocCallback({ exists: () => true, data: () => ({ role: 'donor' }) }));

    await waitFor(() => expect(profileDocCallback).toBeDefined());
    act(() => profileDocCallback({ id: 'donor-1', exists: () => true, data: () => ({ fullName: 'Jane Doe' }) }));

    await waitFor(() => {
      expect(screen.getByText(/profile:Jane Doe/)).toBeInTheDocument();
    });
  });
});
