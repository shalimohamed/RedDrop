import { useEffect, useState } from 'react';

let loadingPromise = null;

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error('Set VITE_GOOGLE_MAPS_API_KEY in .env.local to enable the map.'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Maps.'));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

export function useGoogleMaps() {
  const [google, setGoogle] = useState(window.google ?? null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (google) return;
    loadGoogleMaps()
      .then(setGoogle)
      .catch((err) => setError(err.message));
  }, [google]);

  return { google, error };
}
