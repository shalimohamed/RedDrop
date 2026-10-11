import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useGoogleMapsMock = vi.fn();
vi.mock('../../utils/useGoogleMaps', () => ({ useGoogleMaps: () => useGoogleMapsMock() }));

const { default: MapView } = await import('./MapView');

function makeFakeGoogle() {
  const markerInstances = [];
  class Marker {
    constructor(opts) {
      Object.assign(this, opts);
      markerInstances.push(this);
    }
    setMap(map) {
      this.map = map;
    }
  }
  class Map {
    constructor(el, opts) {
      this.el = el;
      this.opts = opts;
    }
  }
  return { google: { maps: { Map, Marker } }, markerInstances };
}

describe('MapView', () => {
  it('shows the loader error message when Google Maps fails to load', () => {
    useGoogleMapsMock.mockReturnValue({ google: null, error: 'Set VITE_GOOGLE_MAPS_API_KEY in .env.local to enable the map.' });
    render(<MapView facilities={[]} />);
    expect(screen.getByText(/VITE_GOOGLE_MAPS_API_KEY/)).toBeInTheDocument();
  });

  it('renders a map container once google is loaded', () => {
    const { google } = makeFakeGoogle();
    useGoogleMapsMock.mockReturnValue({ google, error: '' });
    const { container } = render(<MapView facilities={[]} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('only places markers for facilities that have lat/lng set', () => {
    const { google, markerInstances } = makeFakeGoogle();
    useGoogleMapsMock.mockReturnValue({ google, error: '' });

    render(
      <MapView
        facilities={[
          { id: 'f1', facilityName: 'Has Location', lat: -1.28, lng: 36.8 },
          { id: 'f2', facilityName: 'No Location', lat: null, lng: null },
        ]}
      />,
    );

    expect(markerInstances).toHaveLength(1);
    expect(markerInstances[0].title).toBe('Has Location');
  });
});
