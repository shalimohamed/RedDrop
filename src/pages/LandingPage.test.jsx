import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const listenActiveAppealsMock = vi.fn();
const getCountFromServerMock = vi.fn();
const getDocMock = vi.fn();

vi.mock('../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../services/appeals', () => ({
  listenActiveAppeals: (...args) => listenActiveAppealsMock(...args),
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc: vi.fn((_db, ...path) => path.join('/')),
  getCountFromServer: (...args) => getCountFromServerMock(...args),
  getDoc: (...args) => getDocMock(...args),
}));
vi.mock('../firebase/config', () => ({ db: {} }));

const { default: LandingPage } = await import('./LandingPage');

beforeEach(() => {
  useAuthMock.mockReturnValue({ user: null });
  listenActiveAppealsMock.mockReset();
  getCountFromServerMock.mockReset();
  getDocMock.mockReset();
  listenActiveAppealsMock.mockReturnValue(vi.fn());
  getCountFromServerMock.mockResolvedValue({ data: () => ({ count: 7 }) });
  getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ totalResponses: 7 }) });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  it('shows registration CTAs for guest users', () => {
    renderPage();
    expect(screen.getByText(/one donation\. a second chance/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register as donor/i })).toHaveAttribute('href', '/register/donor');
    expect(screen.getByRole('link', { name: /register as a facility/i })).toHaveAttribute(
      'href',
      '/register/facility',
    );
  });

  it('hides registration CTAs for logged-in users', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'u1' } });
    renderPage();
    expect(screen.queryByRole('link', { name: /register as donor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /register as a facility/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse appeals/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view blood drives/i })).toBeInTheDocument();
  });

  it('shows resolved stat counts once getCountFromServer resolves', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('7')).toHaveLength(3);
    });
  });

  it('shows 0 lives reached when the stats/global counter doc does not exist yet', async () => {
    getDocMock.mockResolvedValue({ exists: () => false });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('7')).toHaveLength(2);
    });
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows an empty state when there are no active appeals', () => {
    renderPage();
    expect(screen.getByText(/no active appeals at the moment/i)).toBeInTheDocument();
  });

  it('renders a preview of active appeals from listenActiveAppeals', () => {
    let captured;
    listenActiveAppealsMock.mockImplementation((onChange) => {
      captured = onChange;
      return vi.fn();
    });
    renderPage();
    act(() => captured([{ id: 'a1', bloodType: 'O+', facilityName: 'Hosp', urgencyLevel: 'Urgent', createdAt: null }]));

    expect(screen.getByText('O+')).toBeInTheDocument();
    expect(screen.getByText('Hosp')).toBeInTheDocument();
  });
});
