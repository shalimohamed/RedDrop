import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useGoogleMapsMock = vi.fn();
const setFacilityCoordinatesMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../../utils/useGoogleMaps', () => ({ useGoogleMaps: () => useGoogleMapsMock() }));
vi.mock('../../services/facilities', () => ({
  setFacilityCoordinates: (...args) => setFacilityCoordinatesMock(...args),
}));

const { default: LocationPicker } = await import('./LocationPicker');

function makeFakeGoogle({ geocodeResult = [{ formatted_address: 'Resolved Address, Nairobi' }], geocodeStatus = 'OK' } = {}) {
  let mapClickHandler;
  const markerInstances = [];
  const geocodeCalls = [];

  class Marker {
    constructor(opts) {
      Object.assign(this, opts);
      this.listeners = {};
      markerInstances.push(this);
    }
    setMap(map) {
      this.map = map;
    }
    setPosition(pos) {
      this.position = pos;
    }
    addListener(event, handler) {
      this.listeners[event] = handler;
    }
  }

  class Map {
    constructor(el, opts) {
      this.el = el;
      this.opts = opts;
    }
    addListener(event, handler) {
      if (event === 'click') mapClickHandler = handler;
    }
    panTo() {}
    setZoom() {}
  }

  class Geocoder {
    geocode(request, callback) {
      geocodeCalls.push(request);
      callback(geocodeResult, geocodeStatus);
    }
  }

  return {
    google: { maps: { Map, Marker, Geocoder } },
    markerInstances,
    geocodeCalls,
    clickMap: (lat, lng) => mapClickHandler({ latLng: { lat: () => lat, lng: () => lng } }),
  };
}

beforeEach(() => {
  setFacilityCoordinatesMock.mockClear();
});

describe('LocationPicker', () => {
  it('shows the loader error message when Google Maps fails to load', () => {
    useGoogleMapsMock.mockReturnValue({ google: null, error: 'Failed to load Google Maps.' });
    render(<LocationPicker facilityId="f1" lat={null} lng={null} />);
    expect(screen.getByText('Failed to load Google Maps.')).toBeInTheDocument();
  });

  it('disables Save until a pin is placed, reverse-geocodes it, and saves both on click', async () => {
    const { google, clickMap, geocodeCalls } = makeFakeGoogle();
    useGoogleMapsMock.mockReturnValue({ google, error: '' });
    render(<LocationPicker facilityId="f1" lat={null} lng={null} />);

    expect(screen.getByRole('button', { name: /save location/i })).toBeDisabled();

    clickMap(-1.28, 36.82);
    await waitFor(() => expect(screen.getByRole('button', { name: /save location/i })).toBeEnabled());
    expect(geocodeCalls).toEqual([{ location: { lat: -1.28, lng: 36.82 } }]);
    expect(screen.getByText(/will update your listed address to: Resolved Address, Nairobi/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save location/i }));

    await waitFor(() => {
      expect(setFacilityCoordinatesMock).toHaveBeenCalledWith('f1', {
        lat: -1.28,
        lng: 36.82,
        address: 'Resolved Address, Nairobi',
      });
      expect(screen.getByText('Location saved.')).toBeInTheDocument();
    });
  });

  it('saves without an address override when reverse geocoding finds nothing', async () => {
    const { google, clickMap } = makeFakeGoogle({ geocodeResult: [], geocodeStatus: 'ZERO_RESULTS' });
    useGoogleMapsMock.mockReturnValue({ google, error: '' });
    render(<LocationPicker facilityId="f1" lat={null} lng={null} />);

    clickMap(-1.28, 36.82);
    await waitFor(() => expect(screen.getByRole('button', { name: /save location/i })).toBeEnabled());
    expect(screen.queryByText(/will update your listed address/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save location/i }));

    await waitFor(() => {
      expect(setFacilityCoordinatesMock).toHaveBeenCalledWith('f1', { lat: -1.28, lng: 36.82, address: undefined });
    });
  });

  it('starts with Save enabled when the facility already has a saved pin', () => {
    const { google } = makeFakeGoogle();
    useGoogleMapsMock.mockReturnValue({ google, error: '' });
    render(<LocationPicker facilityId="f1" lat={-1.28} lng={36.82} />);
    expect(screen.getByRole('button', { name: /save location/i })).toBeEnabled();
  });

  it('uses device geolocation when "Use my current location" is clicked', async () => {
    const { google } = makeFakeGoogle();
    useGoogleMapsMock.mockReturnValue({ google, error: '' });

    const getCurrentPosition = vi.fn((success) => success({ coords: { latitude: -1.3, longitude: 36.9 } }));
    Object.defineProperty(window.navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    render(<LocationPicker facilityId="f1" lat={null} lng={null} />);
    await userEvent.click(screen.getByRole('button', { name: /use my current location/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /save location/i })).toBeEnabled());
  });
});
