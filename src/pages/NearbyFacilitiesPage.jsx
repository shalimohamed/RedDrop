import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenFacilities } from '../services/facilities';
import MapView from '../components/facilities/MapView';
import LocationPicker from '../components/facilities/LocationPicker';

function directionsHref(facility) {
  if (facility.lat && facility.lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address ?? facility.facilityName)}`;
}

export default function NearbyFacilitiesPage() {
  const { user, profile, isFacility } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => listenFacilities(setFacilities), []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return facilities;
    return facilities.filter(
      (facility) =>
        facility.facilityName?.toLowerCase().includes(term) ||
        facility.address?.toLowerCase().includes(term),
    );
  }, [facilities, search]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">Nearby Donation Facilities</h1>

      {isFacility && user && profile && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold text-ink">Your facility location</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Drag the pin to update where your facility appears to donors.
          </p>
          <div className="mt-3">
            <LocationPicker facilityId={user.uid} lat={profile.lat} lng={profile.lng} />
          </div>
        </div>
      )}

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name or location…"
        className="mt-6 w-full max-w-md rounded-full border border-line px-4 py-2 focus:border-blood-600 focus:outline-none"
      />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-ink-soft">No facilities match your search.</p>
          ) : (
            filtered.map((facility) => (
              <article key={facility.id} className="rounded-2xl border border-line bg-paper-raised p-4">
                <h2 className="font-display text-lg font-semibold text-ink">{facility.facilityName}</h2>
                <p className="text-sm text-ink-soft">{facility.type}</p>
                <p className="mt-1 text-sm text-ink-soft">{facility.address}</p>
                <p className="mt-1 text-sm text-ink-soft">{facility.availableHours}</p>
                <a
                  href={directionsHref(facility)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-blood-700 hover:underline"
                >
                  Get directions →
                </a>
              </article>
            ))
          )}
        </div>

        <MapView facilities={filtered} />
      </div>
    </div>
  );
}
