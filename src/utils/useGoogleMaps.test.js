import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('useGoogleMaps', () => {
  const originalKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    delete window.google;
    document.head.innerHTML = '';
  });

  afterEach(() => {
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY = originalKey;
  });

  it('resolves immediately if window.google is already present', async () => {
    window.google = { maps: {} };
    const { useGoogleMaps } = await import('./useGoogleMaps');
    const { result } = renderHook(() => useGoogleMaps());

    expect(result.current.google).toBe(window.google);
    expect(result.current.error).toBe('');
  });

  it('errors when no API key is configured', async () => {
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY = '';
    const { useGoogleMaps } = await import('./useGoogleMaps');
    const { result } = renderHook(() => useGoogleMaps());

    await waitFor(() => expect(result.current.error).toMatch(/VITE_GOOGLE_MAPS_API_KEY/));
  });

  it('injects a script tag with the configured key and resolves google on load', async () => {
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY = 'fake-key';
    const { useGoogleMaps } = await import('./useGoogleMaps');
    const { result } = renderHook(() => useGoogleMaps());

    const script = document.head.querySelector('script');
    expect(script.src).toContain('fake-key');

    window.google = { maps: {} };
    act(() => script.onload());

    await waitFor(() => expect(result.current.google).toBe(window.google));
  });

  it('surfaces a script load failure as an error', async () => {
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY = 'fake-key';
    const { useGoogleMaps } = await import('./useGoogleMaps');
    const { result } = renderHook(() => useGoogleMaps());

    const script = document.head.querySelector('script');
    act(() => script.onerror());

    await waitFor(() => expect(result.current.error).toBe('Failed to load Google Maps.'));
  });
});
