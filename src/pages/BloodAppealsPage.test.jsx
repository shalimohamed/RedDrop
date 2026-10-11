import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const listenActiveAppealsMock = vi.fn();
const listenFacilityAppealsMock = vi.fn();
const listenFacilityResponsesMock = vi.fn();
const listenDonorResponsesMock = vi.fn();
const markResponseDonatedMock = vi.fn().mockResolvedValue(undefined);
const createAppealMock = vi.fn();
const closeAppealMock = vi.fn().mockResolvedValue(undefined);
const updateAppealUrgencyMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../services/appeals', () => ({
  listenActiveAppeals: (...args) => listenActiveAppealsMock(...args),
  listenFacilityAppeals: (...args) => listenFacilityAppealsMock(...args),
  createAppeal: (...args) => createAppealMock(...args),
  closeAppeal: (...args) => closeAppealMock(...args),
  updateAppealUrgency: (...args) => updateAppealUrgencyMock(...args),
}));
vi.mock('../services/responses', () => ({
  listenFacilityResponses: (...args) => listenFacilityResponsesMock(...args),
  listenDonorResponses: (...args) => listenDonorResponsesMock(...args),
  markResponseDonated: (...args) => markResponseDonatedMock(...args),
}));

const { default: BloodAppealsPage } = await import('./BloodAppealsPage');

const facilityProfile = { facilityName: 'Nairobi Hospital', type: 'Hospital', address: '123 Main St' };

function renderPage() {
  return render(
    <MemoryRouter>
      <BloodAppealsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthMock.mockReset();
  listenActiveAppealsMock.mockReset();
  listenFacilityAppealsMock.mockReset();
  listenFacilityResponsesMock.mockReset();
  listenDonorResponsesMock.mockReset();
  markResponseDonatedMock.mockClear();
  createAppealMock.mockReset();
  closeAppealMock.mockClear();
  updateAppealUrgencyMock.mockClear();

  listenActiveAppealsMock.mockReturnValue(vi.fn());
  listenFacilityAppealsMock.mockReturnValue(vi.fn());
  listenFacilityResponsesMock.mockReturnValue(vi.fn());
  listenDonorResponsesMock.mockReturnValue(vi.fn());
  useAuthMock.mockReturnValue({ user: null, role: null, profile: null });
});

describe('BloodAppealsPage — guest/public browse', () => {
  it('shows a loading state before the first snapshot arrives', () => {
    renderPage();
    expect(screen.getByText(/loading appeals/i)).toBeInTheDocument();
  });

  it('shows an empty state once loaded with no appeals', () => {
    listenActiveAppealsMock.mockImplementation((onChange) => {
      onChange([]);
      return vi.fn();
    });
    renderPage();
    expect(screen.getByText(/no active appeals right now/i)).toBeInTheDocument();
  });

  it('renders appeal cards once data arrives', () => {
    listenActiveAppealsMock.mockImplementation((onChange) => {
      onChange([{ id: 'a1', bloodType: 'O+', facilityName: 'Hosp', urgencyLevel: 'Urgent', createdAt: null }]);
      return vi.fn();
    });
    renderPage();
    expect(screen.getByText('O+')).toBeInTheDocument();
  });
});

describe('BloodAppealsPage — donor', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { uid: 'd1' }, role: 'donor', profile: { fullName: 'Jane' } });
    listenActiveAppealsMock.mockReturnValue(vi.fn());
  });

  it('shows an empty state for confirmed responses by default', () => {
    renderPage();
    expect(screen.getByText(/haven't responded to any appeals yet/i)).toBeInTheDocument();
  });

  it('lists a confirmed response', () => {
    listenDonorResponsesMock.mockImplementation((_donorId, onChange) => {
      onChange([
        { id: 'r1', status: 'Confirmed', scheduledTime: null, facilityName: 'City Hospital', urgencyLevel: 'Urgent' },
      ]);
      return vi.fn();
    });
    renderPage();

    expect(screen.getByText('City Hospital')).toBeInTheDocument();
    expect(screen.getByText(/immediate — head in now/i)).toBeInTheDocument();
  });
});

describe('BloodAppealsPage — facility management', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { uid: 'f1' }, role: 'facility', profile: facilityProfile });
  });

  it('posts a new appeal with the selected blood type and default Standard urgency', async () => {
    createAppealMock.mockResolvedValue({ id: 'a1' });
    renderPage();

    await userEvent.selectOptions(screen.getByLabelText(/blood type needed/i), 'O+');
    await userEvent.click(screen.getByRole('button', { name: /^post appeal$/i }));

    await waitFor(() => {
      expect(createAppealMock).toHaveBeenCalledWith({
        facilityId: 'f1',
        facilityName: 'Nairobi Hospital',
        bloodType: 'O+',
        urgencyLevel: 'Standard',
        role: 'facility',
      });
    });
    expect(screen.getByText(/appeal posted and now visible publicly/i)).toBeInTheDocument();
  });

  it('shows the service error if posting an appeal fails', async () => {
    createAppealMock.mockRejectedValue(new Error('Only registered facilities may post blood appeals.'));
    renderPage();

    await userEvent.selectOptions(screen.getByLabelText(/blood type needed/i), 'O+');
    await userEvent.click(screen.getByRole('button', { name: /^post appeal$/i }));

    await waitFor(() => {
      expect(screen.getByText('Only registered facilities may post blood appeals.')).toBeInTheDocument();
    });
  });

  it('lists active appeals and lets the facility change urgency or close one', async () => {
    listenFacilityAppealsMock.mockImplementation((_facilityId, onChange) => {
      onChange([{ id: 'a1', bloodType: 'O+', status: 'Active', urgencyLevel: 'Standard' }]);
      return vi.fn();
    });
    renderPage();

    const activeSection = screen.getByText('Active appeals').closest('section');
    expect(within(activeSection).getByText('O+')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/update urgency level for the o\+ appeal/i), 'Urgent');
    expect(updateAppealUrgencyMock).toHaveBeenCalledWith('a1', 'Urgent');

    await userEvent.click(within(activeSection).getByRole('button', { name: /close/i }));
    expect(closeAppealMock).toHaveBeenCalledWith('a1');
  });

  it('shows closed/fulfilled appeals under history, read-only with no "I can donate" option', () => {
    listenFacilityAppealsMock.mockImplementation((_facilityId, onChange) => {
      onChange([{ id: 'a1', bloodType: 'O+', status: 'Closed', urgencyLevel: 'Standard' }]);
      return vi.fn();
    });
    renderPage();

    const historySection = screen.getByText('Appeal history').closest('section');
    expect(within(historySection).getByText('O+')).toBeInTheDocument();
    expect(within(historySection).queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/i can donate/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when no donors have responded yet', () => {
    renderPage();
    expect(screen.getByText(/no donor responses yet/i)).toBeInTheDocument();
  });

  it('lists donor responses with contact details and lets the facility mark one donated', async () => {
    listenFacilityResponsesMock.mockImplementation((_facilityId, onChange) => {
      onChange([
        { id: 'r1', status: 'Confirmed', donorId: 'd1', name: 'Jane Doe', phone: '0700000000', bloodType: 'O-', urgencyLevel: 'Urgent', scheduledTime: null },
      ]);
      return vi.fn();
    });
    renderPage();

    expect(screen.getByText('Jane Doe', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '0700000000' })).toHaveAttribute('href', 'tel:0700000000');

    await userEvent.click(screen.getByRole('button', { name: /mark donated/i }));
    expect(markResponseDonatedMock).toHaveBeenCalledWith('r1', 'd1');
  });

  it('shows opened and closed dates for a history appeal', () => {
    listenFacilityAppealsMock.mockImplementation((_facilityId, onChange) => {
      onChange([
        {
          id: 'a1',
          bloodType: 'O+',
          status: 'Closed',
          urgencyLevel: 'Standard',
          createdAt: { toDate: () => new Date('2026-05-01T10:00:00Z') },
          closedAt: { toDate: () => new Date('2026-05-03T12:00:00Z') },
        },
      ]);
      return vi.fn();
    });
    renderPage();

    const historySection = screen.getByText('Appeal history').closest('section');
    expect(within(historySection).getByText(/opened may 1, 2026/i)).toBeInTheDocument();
    expect(within(historySection).getByText(/closed.*may 3, 2026/i)).toBeInTheDocument();
  });

  it('shows a donated timestamp under a Donated response', () => {
    listenFacilityResponsesMock.mockImplementation((_facilityId, onChange) => {
      onChange([
        {
          id: 'r1',
          status: 'Donated',
          name: 'Jane Doe',
          phone: '0700000000',
          bloodType: 'O-',
          urgencyLevel: 'Urgent',
          scheduledTime: null,
          donatedAt: { toDate: () => new Date('2026-06-15T09:00:00Z') },
        },
      ]);
      return vi.fn();
    });
    renderPage();

    expect(screen.getByText('Donated ✓')).toBeInTheDocument();
    expect(screen.getByText(/jun 15, 2026/i)).toBeInTheDocument();
  });

  it('paginates appeal history 5 at a time with a Show more button', async () => {
    const appeals = Array.from({ length: 7 }, (_, i) => ({
      id: `a${i}`,
      bloodType: 'O+',
      status: 'Closed',
      urgencyLevel: 'Standard',
    }));
    listenFacilityAppealsMock.mockImplementation((_facilityId, onChange) => {
      onChange(appeals);
      return vi.fn();
    });
    renderPage();

    const historySection = screen.getByText('Appeal history').closest('section');
    expect(within(historySection).getAllByText('O+')).toHaveLength(5);

    await userEvent.click(within(historySection).getByRole('button', { name: /show more/i }));
    expect(within(historySection).getAllByText('O+')).toHaveLength(7);
    expect(within(historySection).queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
  });

  it('paginates donor responses 5 at a time with a Show more button', async () => {
    const responses = Array.from({ length: 6 }, (_, i) => ({
      id: `r${i}`,
      status: 'Confirmed',
      name: `Donor ${i}`,
      phone: '0700000000',
      bloodType: 'O-',
      urgencyLevel: 'Standard',
      scheduledTime: null,
    }));
    listenFacilityResponsesMock.mockImplementation((_facilityId, onChange) => {
      onChange(responses);
      return vi.fn();
    });
    renderPage();

    const responsesSection = screen.getByText('Donor responses').closest('section');
    expect(within(responsesSection).getAllByText(/donor \d/i)).toHaveLength(5);

    await userEvent.click(within(responsesSection).getByRole('button', { name: /show more/i }));
    expect(within(responsesSection).getAllByText(/donor \d/i)).toHaveLength(6);
  });

  it('shows the donors-received count as the number of Donated responses', () => {
    listenFacilityResponsesMock.mockImplementation((_facilityId, onChange) => {
      onChange([
        { id: 'r1', status: 'Donated', name: 'A', phone: '0700', bloodType: 'O+', urgencyLevel: 'Standard', scheduledTime: null },
        { id: 'r2', status: 'Confirmed', name: 'B', phone: '0701', bloodType: 'O-', urgencyLevel: 'Urgent', scheduledTime: null },
        { id: 'r3', status: 'Donated', name: 'C', phone: '0702', bloodType: 'A+', urgencyLevel: 'Standard', scheduledTime: null },
      ]);
      return vi.fn();
    });
    renderPage();

    const responsesSection = screen.getByText('Donor responses').closest('section');
    expect(within(responsesSection).getByText('2')).toBeInTheDocument();
    expect(within(responsesSection).getByText(/donors received/i)).toBeInTheDocument();
  });
});
