import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDocsMock = vi.fn();
const onSnapshotMock = vi.fn();
const updateDocMock = vi.fn().mockResolvedValue(undefined);
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  getDocs: (...args) => getDocsMock(...args),
  onSnapshot: (...args) => onSnapshotMock(...args),
  doc: vi.fn((_db, ...path) => path.join('/')),
  updateDoc: (...args) => updateDocMock(...args),
}));
vi.mock('../firebase/config', () => ({ db: {} }));

const { listenFacilities, getFacilitiesOnce, setFacilityCoordinates } = await import('./facilities');

beforeEach(() => {
  getDocsMock.mockReset();
  onSnapshotMock.mockReset();
  updateDocMock.mockClear();
});

describe('setFacilityCoordinates (FR-011)', () => {
  it('writes lat/lng to the facility doc', async () => {
    await setFacilityCoordinates('f1', { lat: -1.28, lng: 36.82 });
    expect(updateDocMock).toHaveBeenCalledWith('facilities/f1', { lat: -1.28, lng: 36.82 });
  });

  it('also overwrites the text address when a reverse-geocoded one is given', async () => {
    await setFacilityCoordinates('f1', { lat: -1.28, lng: 36.82, address: 'Westlands, Nairobi' });
    expect(updateDocMock).toHaveBeenCalledWith('facilities/f1', {
      lat: -1.28,
      lng: 36.82,
      address: 'Westlands, Nairobi',
    });
  });

  it('leaves the address untouched when none is given', async () => {
    await setFacilityCoordinates('f1', { lat: -1.28, lng: 36.82, address: undefined });
    expect(updateDocMock).toHaveBeenCalledWith('facilities/f1', { lat: -1.28, lng: 36.82 });
  });
});

describe('getFacilitiesOnce', () => {
  it('maps each doc to { id, ...data }', async () => {
    getDocsMock.mockResolvedValue({
      docs: [{ id: 'f1', data: () => ({ facilityName: 'Hosp' }) }],
    });

    const result = await getFacilitiesOnce();
    expect(result).toEqual([{ id: 'f1', facilityName: 'Hosp' }]);
  });
});

describe('listenFacilities', () => {
  it('subscribes to the facilities collection and maps snapshot docs', () => {
    const unsubscribe = vi.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onChange = vi.fn();

    const result = listenFacilities(onChange);
    expect(result).toBe(unsubscribe);

    const [, callback] = onSnapshotMock.mock.calls[0];
    callback({ docs: [{ id: 'f1', data: () => ({ facilityName: 'Hosp' }) }] });
    expect(onChange).toHaveBeenCalledWith([{ id: 'f1', facilityName: 'Hosp' }]);
  });
});
