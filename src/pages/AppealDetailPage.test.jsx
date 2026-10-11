import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listenAppealMock = vi.fn();
vi.mock('../services/appeals', () => ({ listenAppeal: (...args) => listenAppealMock(...args) }));
vi.mock('../components/appeals/GuestResponseForm', () => ({
  default: ({ appeal }) => <div data-testid="response-form">form for {appeal.id}</div>,
}));

const { default: AppealDetailPage } = await import('./AppealDetailPage');

beforeEach(() => {
  listenAppealMock.mockReset();
});

function renderPage(appealId = 'a1') {
  return render(
    <MemoryRouter initialEntries={[`/appeals/${appealId}`]}>
      <Routes>
        <Route path="/appeals/:appealId" element={<AppealDetailPage />} />
        <Route path="/appeals" element={<p>Appeals feed</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppealDetailPage', () => {
  it('shows a loading state before the appeal resolves', () => {
    listenAppealMock.mockReturnValue(vi.fn());
    renderPage();
    expect(screen.getByText(/loading appeal/i)).toBeInTheDocument();
  });

  it('shows a not-found message and a link back when the appeal is null', () => {
    listenAppealMock.mockImplementation((_id, onChange) => {
      onChange(null);
      return vi.fn();
    });
    renderPage();
    expect(screen.getByText(/no longer exists or has been closed/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to active appeals/i })).toHaveAttribute('href', '/appeals');
  });

  it('renders the appeal details and the response form once loaded', () => {
    listenAppealMock.mockImplementation((_id, onChange) => {
      onChange({ id: 'a1', bloodType: 'O+', facilityName: 'Nairobi Hospital', urgencyLevel: 'Urgent' });
      return vi.fn();
    });
    renderPage('a1');

    expect(screen.getByText('O+')).toBeInTheDocument();
    expect(screen.getByText('Nairobi Hospital')).toBeInTheDocument();
    expect(screen.getByTestId('response-form')).toHaveTextContent('form for a1');
  });
});
