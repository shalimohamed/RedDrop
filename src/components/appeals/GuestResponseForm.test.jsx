import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const submitAppealResponseMock = vi.fn();

vi.mock('../../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../../services/responses', () => ({
  submitAppealResponse: (...args) => submitAppealResponseMock(...args),
}));

const { default: GuestResponseForm } = await import('./GuestResponseForm');

const urgentAppeal = {
  id: 'a1',
  facilityId: 'f1',
  bloodType: 'AB+',
  urgencyLevel: 'Urgent',
  facilityName: 'Nairobi Hospital',
};
const standardAppeal = {
  id: 'a2',
  facilityId: 'f1',
  bloodType: 'AB+',
  urgencyLevel: 'Standard',
  facilityName: 'Nairobi Hospital',
};

beforeEach(() => {
  submitAppealResponseMock.mockReset();
  useAuthMock.mockReturnValue({ user: null, profile: null, role: null });
});

function renderForm(appeal) {
  return render(
    <MemoryRouter>
      <GuestResponseForm appeal={appeal} />
    </MemoryRouter>,
  );
}

describe('GuestResponseForm', () => {
  it('shows an immediate-arrival notice and no time picker for Urgent appeals', () => {
    renderForm(urgentAppeal);
    expect(screen.getByText(/proceed to Nairobi Hospital immediately/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/arrival time/i)).not.toBeInTheDocument();
  });

  it('shows a time picker for Standard appeals', () => {
    renderForm(standardAppeal);
    expect(screen.getByLabelText(/arrival time/i)).toBeInTheDocument();
  });

  it('offers a fixed list of time slots (not a free date/time picker) for Standard appeals', () => {
    renderForm(standardAppeal);
    const timeSelect = screen.getByLabelText(/arrival time/i);
    expect(timeSelect.tagName).toBe('SELECT');
    expect(timeSelect.querySelectorAll('option').length).toBeGreaterThan(1);
  });

  it('submits a Standard response with a time picked from the slot list', async () => {
    submitAppealResponseMock.mockResolvedValue({ id: 'r1' });
    renderForm(standardAppeal);

    await userEvent.type(screen.getByLabelText(/full name/i), 'Guest Donor');
    await userEvent.type(screen.getByLabelText(/phone number/i), '0700000000');
    await userEvent.selectOptions(screen.getByLabelText(/your blood type/i), 'AB+');
    const timeSelect = screen.getByLabelText(/arrival time/i);
    const firstOptionValue = timeSelect.querySelectorAll('option')[1].value;
    await userEvent.selectOptions(timeSelect, firstOptionValue);
    await userEvent.click(screen.getByRole('button', { name: /confirm i can donate/i }));

    await waitFor(() => {
      expect(submitAppealResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({ scheduledTime: firstOptionValue }),
      );
    });
  });

  it('shows a read-only summary of the donor\'s own details instead of asking again', () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'd1' },
      profile: { fullName: 'Jane Doe', bloodType: 'O-', phone: '0722000000' },
      role: 'donor',
    });
    renderForm(urgentAppeal);

    expect(screen.getByText('Confirming as Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('O- · 0722000000')).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/phone number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/your blood type/i)).not.toBeInTheDocument();
  });

  it('warns when the selected blood type is incompatible with the appeal', async () => {
    renderForm({ id: 'a3', bloodType: 'O-', urgencyLevel: 'Urgent', facilityName: 'Hosp' });
    await userEvent.selectOptions(screen.getByLabelText(/your blood type/i), 'A+');
    expect(screen.getByText(/cannot donate to a O- appeal/i)).toBeInTheDocument();
  });

  it('submits a guest response with donorId null and shows the thank-you state', async () => {
    submitAppealResponseMock.mockResolvedValue({ id: 'r1' });
    renderForm(urgentAppeal);

    await userEvent.type(screen.getByLabelText(/full name/i), 'Guest Donor');
    await userEvent.type(screen.getByLabelText(/phone number/i), '0700000000');
    await userEvent.selectOptions(screen.getByLabelText(/your blood type/i), 'AB+');
    await userEvent.click(screen.getByRole('button', { name: /confirm i can donate/i }));

    await waitFor(() => {
      expect(submitAppealResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          appealId: 'a1',
          facilityId: 'f1',
          facilityName: 'Nairobi Hospital',
          donorId: null,
          name: 'Guest Donor',
          phone: '0700000000',
          bloodType: 'AB+',
          scheduledTime: null,
        }),
      );
    });
    expect(screen.getByText(/you're confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/please head to Nairobi Hospital now/i)).toBeInTheDocument();
  });

  it('submits with the donor uid and profile details when logged in as a donor', async () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'd1' },
      profile: { fullName: 'Jane Doe', bloodType: 'AB+', phone: '0711111111' },
      role: 'donor',
    });
    submitAppealResponseMock.mockResolvedValue({ id: 'r1' });
    renderForm(urgentAppeal);

    await userEvent.click(screen.getByRole('button', { name: /confirm i can donate/i }));

    await waitFor(() => {
      expect(submitAppealResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          donorId: 'd1',
          name: 'Jane Doe',
          phone: '0711111111',
          bloodType: 'AB+',
        }),
      );
    });
  });

  it('shows the service error message and stays on the form when submission fails', async () => {
    submitAppealResponseMock.mockRejectedValue(new Error('A O+ donor is not compatible with this appeal.'));
    renderForm(urgentAppeal);

    await userEvent.type(screen.getByLabelText(/full name/i), 'Guest Donor');
    await userEvent.type(screen.getByLabelText(/phone number/i), '0700000000');
    await userEvent.selectOptions(screen.getByLabelText(/your blood type/i), 'AB+');
    await userEvent.click(screen.getByRole('button', { name: /confirm i can donate/i }));

    await waitFor(() => {
      expect(screen.getByText('A O+ donor is not compatible with this appeal.')).toBeInTheDocument();
    });
    expect(screen.queryByText(/you're confirmed/i)).not.toBeInTheDocument();
  });
});
