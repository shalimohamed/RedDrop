import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AppealCard from './AppealCard';

function renderCard(appeal) {
  return render(
    <MemoryRouter>
      <AppealCard appeal={appeal} />
    </MemoryRouter>,
  );
}

describe('AppealCard', () => {
  it('renders the blood type, facility, urgency badge, and a link to the detail page', () => {
    renderCard({
      id: 'a1',
      bloodType: 'O+',
      facilityName: 'Nairobi Hospital',
      urgencyLevel: 'Urgent',
      createdAt: null,
    });

    expect(screen.getByText('O+')).toBeInTheDocument();
    expect(screen.getByText('Nairobi Hospital')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /i can donate/i })).toHaveAttribute('href', '/appeals/a1');
  });

  it('shows "just now" when there is no createdAt timestamp yet', () => {
    renderCard({ id: 'a1', bloodType: 'O+', facilityName: 'Hosp', urgencyLevel: 'Standard', createdAt: null });
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it('formats a Firestore-like timestamp into a relative time', () => {
    const fixedDate = new Date(Date.now() - 5 * 60 * 1000);
    const fiveMinutesAgo = { toDate: () => fixedDate };
    renderCard({ id: 'a1', bloodType: 'O+', facilityName: 'Hosp', urgencyLevel: 'Standard', createdAt: fiveMinutesAgo });
    expect(screen.getByText(/5 min ago/i)).toBeInTheDocument();
  });

  it('formats a timestamp from hours ago', () => {
    const fixedDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const threeHoursAgo = { toDate: () => fixedDate };
    renderCard({ id: 'a1', bloodType: 'O+', facilityName: 'Hosp', urgencyLevel: 'Standard', createdAt: threeHoursAgo });
    expect(screen.getByText(/3 hr ago/i)).toBeInTheDocument();
  });

  it('formats a timestamp from days ago', () => {
    const fixedDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = { toDate: () => fixedDate };
    renderCard({ id: 'a1', bloodType: 'O+', facilityName: 'Hosp', urgencyLevel: 'Standard', createdAt: twoDaysAgo });
    expect(screen.getByText(/2 day\(s\) ago/i)).toBeInTheDocument();
  });
});
