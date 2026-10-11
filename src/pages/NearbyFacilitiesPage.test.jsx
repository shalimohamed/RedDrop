import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listenFacilitiesMock = vi.fn();
vi.mock('../services/facilities', () => ({
  listenFacilities: (...args) => listenFacilitiesMock(...args),
}));
vi.mock('../components/facilities/MapView', () => ({
  default: ({ facilities }) => <div data-testid="map-view">{facilities.length} pinned</div>,
}));

const { default: NearbyFacilitiesPage } = await import('./NearbyFacilitiesPage');

const facilities = [
  {
    id: 'f1',
    facilityName: 'Nairobi Hospital',
    type: 'Hospital',
    address: 'Upper Hill',
    availableHours: '24/7',
    lat: -1.2921,
    lng: 36.8219,
  },
  { id: 'f2', facilityName: 'Karen Blood Bank', type: 'Blood Bank', address: 'Karen', availableHours: '8am-6pm' },
];

beforeEach(() => {
  listenFacilitiesMock.mockReset();
  listenFacilitiesMock.mockImplementation((onChange) => {
    onChange(facilities);
    return vi.fn();
  });
});

describe('NearbyFacilitiesPage', () => {
  it('lists all facilities by default', () => {
    render(<NearbyFacilitiesPage />);
    expect(screen.getByText('Nairobi Hospital')).toBeInTheDocument();
    expect(screen.getByText('Karen Blood Bank')).toBeInTheDocument();
    expect(screen.getByTestId('map-view')).toHaveTextContent('2 pinned');
  });

  it('filters by name as the user types', async () => {
    render(<NearbyFacilitiesPage />);
    await userEvent.type(screen.getByPlaceholderText(/search by name or location/i), 'Karen');

    expect(screen.queryByText('Nairobi Hospital')).not.toBeInTheDocument();
    expect(screen.getByText('Karen Blood Bank')).toBeInTheDocument();
  });

  it('shows a no-match message when the search has no results', async () => {
    render(<NearbyFacilitiesPage />);
    await userEvent.type(screen.getByPlaceholderText(/search by name or location/i), 'Nonexistent');
    expect(screen.getByText(/no facilities match your search/i)).toBeInTheDocument();
  });

  it('points "Get directions" at the pinned lat/lng when the facility has one', () => {
    render(<NearbyFacilitiesPage />);
    const links = screen.getAllByRole('link', { name: /get directions/i });
    expect(links[0]).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=-1.2921,36.8219',
    );
  });

  it('falls back to an address search when the facility has no pinned location', () => {
    render(<NearbyFacilitiesPage />);
    const links = screen.getAllByRole('link', { name: /get directions/i });
    expect(links[1]).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Karen',
    );
  });
});
