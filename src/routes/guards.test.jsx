import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));

const { RequireAuth, RequireDonor, RequireFacility } = await import('./guards');

function LoginStub() {
  const location = useLocation();
  return <p>Login page (from: {location.state?.from?.pathname ?? 'none'})</p>;
}

function renderGuarded(Guard, authState, initialPath = '/protected') {
  useAuthMock.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <Guard>
              <p>Protected content</p>
            </Guard>
          }
        />
        <Route path="/login" element={<LoginStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('renders nothing while the initial auth check is loading', () => {
    const { container } = renderGuarded(RequireAuth, { user: null, loading: true });
    expect(container).toBeEmptyDOMElement();
  });

  it('redirects guests to /login, remembering where they came from', () => {
    renderGuarded(RequireAuth, { user: null, loading: false });
    expect(screen.getByText('Login page (from: /protected)')).toBeInTheDocument();
  });

  it('renders children for a signed-in user', () => {
    renderGuarded(RequireAuth, { user: { uid: 'u1' }, loading: false });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});

describe('RequireDonor', () => {
  it('does not redirect while loading is true, even with no role yet', () => {
    const { container } = renderGuarded(RequireDonor, { role: null, loading: true });
    expect(container).toBeEmptyDOMElement();
  });

  it('redirects a non-donor (e.g. a facility) to /login, remembering where they came from', () => {
    renderGuarded(RequireDonor, { role: 'facility', loading: false });
    expect(screen.getByText('Login page (from: /protected)')).toBeInTheDocument();
  });

  it('renders children for a donor', () => {
    renderGuarded(RequireDonor, { role: 'donor', loading: false });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});

describe('RequireFacility', () => {
  it('redirects a non-facility (e.g. a donor) to /login, remembering where they came from', () => {
    renderGuarded(RequireFacility, { role: 'donor', loading: false });
    expect(screen.getByText('Login page (from: /protected)')).toBeInTheDocument();
  });

  it('renders children for a facility', () => {
    renderGuarded(RequireFacility, { role: 'facility', loading: false });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
