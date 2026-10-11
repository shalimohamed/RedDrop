import { beforeEach, describe, expect, it, vi } from 'vitest';

const addDocMock = vi.fn().mockResolvedValue({ id: 'event-1' });
const onSnapshotMock = vi.fn();
vi.mock('firebase/firestore', () => ({
  addDoc: (...args) => addDocMock(...args),
  collection: vi.fn((_db, name) => ({ __collection: name })),
  onSnapshot: (...args) => onSnapshotMock(...args),
  orderBy: vi.fn((field, direction) => ({ __orderBy: field, direction })),
  query: vi.fn((ref, ...clauses) => ({ ref, clauses })),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));
vi.mock('../firebase/config', () => ({ db: {} }));

const { createBloodDriveEvent, listenUpcomingEvents } = await import('./events');

beforeEach(() => {
  addDocMock.mockClear();
  onSnapshotMock.mockReset();
});

const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const baseEvent = {
  facilityId: 'f1',
  facilityName: 'Nairobi Hospital',
  eventName: 'World Blood Donor Day Drive',
  date: futureDate,
  time: '09:00',
  location: 'Uhuru Park',
  targetBloodTypes: ['O-', 'O+'],
  role: 'facility',
};

describe('createBloodDriveEvent (FR-012)', () => {
  it('rejects a non-facility role', async () => {
    await expect(createBloodDriveEvent({ ...baseEvent, role: 'donor' })).rejects.toThrow(
      'Only registered facilities may publish blood drive events.',
    );
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('rejects when required fields are missing', async () => {
    await expect(createBloodDriveEvent({ ...baseEvent, targetBloodTypes: [] })).rejects.toThrow(
      'Event name, date, time, location, and target blood types are required.',
    );
  });

  it('rejects a date in the past', async () => {
    await expect(createBloodDriveEvent({ ...baseEvent, date: '2020-01-01' })).rejects.toThrow(
      'Event date cannot be in the past.',
    );
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('persists the event with a server timestamp', async () => {
    await createBloodDriveEvent(baseEvent);

    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = addDocMock.mock.calls[0];
    expect(payload).toMatchObject({
      facilityId: 'f1',
      facilityName: 'Nairobi Hospital',
      eventName: 'World Blood Donor Day Drive',
      date: futureDate,
      time: '09:00',
      location: 'Uhuru Park',
      targetBloodTypes: ['O-', 'O+'],
      createdAt: 'SERVER_TIMESTAMP',
    });
  });
});

describe('listenUpcomingEvents (FR-012)', () => {
  it('orders by date ascending and maps snapshot docs', () => {
    const unsubscribe = vi.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onChange = vi.fn();

    const result = listenUpcomingEvents(onChange);

    const [queryArg, callback] = onSnapshotMock.mock.calls[0];
    expect(queryArg.clauses).toContainEqual({ __orderBy: 'date', direction: 'asc' });
    expect(result).toBe(unsubscribe);

    callback({ docs: [{ id: 'e1', data: () => ({ eventName: 'Drive' }) }] });
    expect(onChange).toHaveBeenCalledWith([{ id: 'e1', eventName: 'Drive' }]);
  });
});
