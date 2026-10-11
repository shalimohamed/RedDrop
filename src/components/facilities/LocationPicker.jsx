import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../../utils/useGoogleMaps';
import { setFacilityCoordinates } from '../../services/facilities';
import Button from '../common/Button';

const NAIROBI_CENTER = { lat: -1.2864, lng: 36.8172 };

export default function LocationPicker({ facilityId, lat, lng }) {
  const { google, error } = useGoogleMaps();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const [pin, setPin] = useState(lat && lng ? { lat, lng } : null);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const resolveAddress = (point) => {
    if (!geocoderRef.current) return;
    setGeocoding(true);
    geocoderRef.current.geocode({ location: point }, (results, status) => {
      setGeocoding(false);
      if (status === 'OK' && results?.[0]) {
        setResolvedAddress(results[0].formatted_address);
      }
    });
  };

  const updatePin = (next) => {
    setPin(next);
    setSaved(false);
    resolveAddress(next);
  };

  useEffect(() => {
    if (!google || !containerRef.current || mapRef.current) return;

    mapRef.current = new google.maps.Map(containerRef.current, {
      center: pin ?? NAIROBI_CENTER,
      zoom: pin ? 15 : 12,
      mapId: 'reddrop-facility-location-picker',
    });
    geocoderRef.current = new google.maps.Geocoder();

    mapRef.current.addListener('click', (event) => {
      updatePin({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    });
  }, [google]);

  useEffect(() => {
    if (!google || !mapRef.current) return;

    if (!pin) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: pin,
        draggable: true,
      });
      markerRef.current.addListener('dragend', (event) => {
        updatePin({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      });
    } else {
      markerRef.current.setPosition(pin);
    }
  }, [google, pin]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      updatePin(next);
      mapRef.current?.panTo(next);
      mapRef.current?.setZoom(15);
    });
  };

  const handleSave = async () => {
    if (!pin) return;
    setSaving(true);
    try {
      await setFacilityCoordinates(facilityId, { ...pin, address: resolvedAddress || undefined });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-line bg-paper-raised p-6 text-center text-sm text-ink-soft">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-paper-raised p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Map location</h2>
        <p className="text-xs text-ink-soft">
          Click the map or drag the pin to set where your facility appears for donors.
        </p>
      </div>

      <div ref={containerRef} className="h-64 w-full rounded-xl border border-line" />

      {(geocoding || resolvedAddress) && (
        <p className="text-xs text-ink-soft">
          {geocoding ? 'Looking up address…' : `This will update your listed address to: ${resolvedAddress}`}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="subtle" onClick={handleUseCurrentLocation}>
          Use my current location
        </Button>
        <Button type="button" disabled={!pin || saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save location'}
        </Button>
        {saved && <span className="text-sm text-fulfilled">Location saved.</span>}
      </div>
    </div>
  );
}
