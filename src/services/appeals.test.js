import { beforeEach, describe, expect, it, vi } from 'vitest';

const addDocMock = vi.fn().mockResolvedValue({ id: 'appeal-1' });
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const onSnapshotMock = vi.fn();
vi.mock('firebase/firestore', () => ({
  addDoc: (...args) => addDocMock(...args),
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc: vi.fn((_db, ...path) => path.join('/')),
  onSnapshot: (...args) => onSnapshotMock(...args),
  orderBy: vi.fn((field, direction) => ({ __orderBy: field, direction })),
  query: vi.fn((ref, ...clauses) => ({ ref, clauses })),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  updateDoc: (...args) => updateDocMock(...args),
  where: vi.fn((field, op, value) => ({ __where: field, op, value })),
}));
vi.mock('../firebase/config', () => ({ db: {} }));

const {
  createAppeal,
  updateAppealUrgency,
  closeAppeal,
  markAppealFulfilled,
  listenFacilityAppeals,
  listenAppeal,
  listenActiveAppeals,
} = await import('./appeals');
const { APPEAL_STATUS } = await import('../utils/urgency');

beforeEach(() => {
  addDocMock.mockClear();
  updateDocMock.mockClear();
  onSnapshotMock.mockReset();
});

describe('listenAppeal', () => {
  it('passes the mapped appeal to onChange when it exists', () => {
    const unsubscribe = vi.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onChange = vi.fn();

    const result = listenAppeal('appeal-1', onChange);
    expect(result).toBe(unsubscribe);

    const [, callback] = onSnapshotMock.mock.calls[0];
    callback({ exists: () => true, id: 'appeal-1', data: () => ({ bloodType: 'O+' }) });
    expect(onChange).toHaveBeenCalledWith({ id: 'appeal-1', bloodType: 'O+' });
  });

  it('passes null to onChange when the appeal does not exist', () => {
    onSnapshotMock.mockReturnValue(vi.fn());
    const onChange = vi.fn();

    listenAppeal('missing', onChange);
    const [, callback] = onSnapshotMock.mock.calls[0];
    callback({ exists: () => false });
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('listenActiveAppeals (FR-005)', () => {
  it('filters to Active status, newest first, and maps snapshot docs', () => {
    onSnapshotMock.mockReturnValue(vi.fn());
    const onChange = vi.fn();

    listenActiveAppeals(onChange);

    const [queryArg, callback] = onSnapshotMock.mock.calls[0];
    expect(queryArg.clauses).toContainEqual({ __where: 'status', op: '==', value: APPEAL_STATUS.ACTIVE });
    expect(queryArg.clauses).toContainEqual({ __orderBy: 'createdAt', direction: 'desc' });

    callback({
      docs: [
        { id: 'a1', data: () => ({ bloodType: 'O+' }) },
        { id: 'a2', data: () => ({ bloodType: 'A-' }) },
      ],
    });
    expect(onChange).toHaveBeenCalledWith([
      { id: 'a1', bloodType: 'O+' },
      { id: 'a2', bloodType: 'A-' },
    ]);
  });

  it('truncates to limitTo when provided', () => {
    onSnapshotMock.mockReturnValue(vi.fn());
    const onChange = vi.fn();

    listenActiveAppeals(onChange, { limitTo: 1 });
    const [, callback] = onSnapshotMock.mock.calls[0];
    callback({
      docs: [
        { id: 'a1', data: () => ({}) },
        { id: 'a2', data: () => ({}) },
      ],
    });
    expect(onChange).toHaveBeenCalledWith([{ id: 'a1' }]);
  });
});

describe('createAppeal (FR-004)', () => {
  it('rejects a non-facility role even if other fields are valid', async () => {
    await expect(
      createAppeal({ facilityId: 'f1', facilityName: 'Hosp', bloodType: 'O+', urgencyLevel: 'Urgent', role: 'donor' }),
    ).rejects.toThrow('Only registered facilities may post blood appeals.');
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('rejects missing required fields', async () => {
    await expect(
      createAppeal({ facilityId: 'f1', facilityName: 'Hosp', bloodType: '', urgencyLevel: 'Urgent', role: 'facility' }),
    ).rejects.toThrow('Facility, blood type, and urgency level are required.');
  });

  it('creates the appeal as Active with a server timestamp', async () => {
    await createAppeal({ facilityId: 'f1', facilityName: 'Hosp', bloodType: 'O+', urgencyLevel: 'Urgent', role: 'facility' });

    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = addDocMock.mock.calls[0];
    expect(payload).toMatchObject({
      facilityId: 'f1',
      facilityName: 'Hosp',
      bloodType: 'O+',
      urgencyLevel: 'Urgent',
      status: APPEAL_STATUS.ACTIVE,
      createdAt: 'SERVER_TIMESTAMP',
    });
  });
});

describe('updateAppealUrgency / closeAppeal / markAppealFulfilled (FR-015)', () => {
  it('updates urgencyLevel on the appeal doc', async () => {
    await updateAppealUrgency('appeal-1', 'Urgent');
    expect(updateDocMock).toHaveBeenCalledWith('appeals/appeal-1', { urgencyLevel: 'Urgent' });
  });

  it('sets status to Closed with a closedAt timestamp', async () => {
    await closeAppeal('appeal-1');
    expect(updateDocMock).toHaveBeenCalledWith('appeals/appeal-1', {
      status: APPEAL_STATUS.CLOSED,
      closedAt: 'SERVER_TIMESTAMP',
    });
  });

  it('sets status to Fulfilled with a fulfilledAt timestamp', async () => {
    await markAppealFulfilled('appeal-1');
    expect(updateDocMock).toHaveBeenCalledWith('appeals/appeal-1', {
      status: APPEAL_STATUS.FULFILLED,
      fulfilledAt: 'SERVER_TIMESTAMP',
    });
  });
});

describe('listenFacilityAppeals (FR-015)', () => {
  it('queries by facilityId, newest first, and maps snapshot docs', () => {
    const unsubscribe = vi.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onChange = vi.fn();

    const result = listenFacilityAppeals('f1', onChange);

    const [queryArg, callback] = onSnapshotMock.mock.calls[0];
    expect(queryArg.clauses).toContainEqual({ __where: 'facilityId', op: '==', value: 'f1' });
    expect(queryArg.clauses).toContainEqual({ __orderBy: 'createdAt', direction: 'desc' });
    expect(result).toBe(unsubscribe);

    callback({ docs: [{ id: 'a1', data: () => ({ status: 'Active' }) }] });
    expect(onChange).toHaveBeenCalledWith([{ id: 'a1', status: 'Active' }]);
  });
});
