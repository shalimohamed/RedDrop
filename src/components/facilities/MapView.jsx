import { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../../utils/useGoogleMaps';

const NAIROBI_CENTER = { lat: -1.2864, lng: 36.8172 };

export default function MapView({ facilities }) {
  const { google, error } = useGoogleMaps();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!google || !containerRef.current) return;
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: NAIROBI_CENTER,
      zoom: 12,
      mapId: 'reddrop-facilities-map',
    });
  }, [google]);

  useEffect(() => {
    if (!google || !mapRef.current) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = facilities
      .filter((facility) => facility.lat && facility.lng)
      .map((facility) => {
        const marker = new google.maps.Marker({
          map: mapRef.current,
          position: { lat: facility.lat, lng: facility.lng },
          title: facility.facilityName,
        });
        return marker;
      });
  }, [google, facilities]);

  if (error) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-line bg-paper-raised p-6 text-center text-sm text-ink-soft">
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className="h-80 w-full rounded-2xl border border-line" />;
}
