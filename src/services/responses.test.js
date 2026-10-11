import { beforeEach, describe, expect, it, vi } from 'vitest';

const addDocMock = vi.fn().mockResolvedValue({ id: 'response-1' });
const onSnapshotMock = vi.fn();
const setDocMock = vi.fn().mockResolvedValue(undefined);
const incrementMock = vi.fn((n) => ({ __increment: n }));
const batchMock = { update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
const writeBatchMock = vi.fn(() => batchMock);
vi.mock('firebase/firestore', () => ({
  addDoc: (...args) => addDocMock(...args),
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc: vi.fn((_db, ...path) => path.join('/')),
  increment: (...args) => incrementMock(...args),
  onSnapshot: (...args) => onSnapshotMock(...args),
  orderBy: vi.fn((field, direction) => ({ __orderBy: field, direction })),
  query: vi.fn((ref, ...clauses) => ({ ref, clauses })),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  setDoc: (...args) => setDocMock(...args),
  where: vi.fn((field, op, value) => ({ __where: field, op, value })),
  writeBatch: (...args) => writeBatchMock(...args),
}));
vi.mock('../firebase/config', () => ({ db: {} }));

const { submitAppealResponse, listenDonorResponses, listenFacilityResponses, markResponseDonated } = await import('./responses');

beforeEach(() => {
  addDocMock.mockClear();
  onSnapshotMock.mockReset();
  setDocMock.mockClear();
  incrementMock.mockClear();
  batchMock.update.mockClear();
  batchMock.commit.mockClear();
  writeBatchMock.mockClear();
});

const baseParams = {
  appealId: 'appeal-1',
  facilityId: 'facility-1',
  facilityName: 'Nairobi Hospital',
  requiredBloodType: 'AB+',
  urgencyLevel: 'Standard',
  donorId: 'donor-1',
  name: 'Jane Doe',
  phone: '0700000000',
  bloodType: 'O-',
  scheduledTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
};

describe('submitAppealResponse (FR-006, FR-007, FR-013)', () => {
  it('rejects when required fields are missing', async () => {
    await expect(submitAppealResponse({ ...baseParams, name: '' })).rejects.toThrow(
      'Name, phone number, and blood type are required.',
    );
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('rejects an incompatible blood type (FR-013)', async () => {
    await expect(
      submitAppealResponse({ ...baseParams, requiredBloodType: 'O-', bloodType: 'A+' }),
    ).rejects.toThrow(/not compatible/);
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('rejects a Standard response with no scheduled time (FR-007)', async () => {
    await expect(submitAppealResponse({ ...baseParams, scheduledTime: null })).rejects.toThrow(
      'Please choose an arrival time within the next two hours.',
    );
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('rejects a Standard response scheduled more than two hours out', async () => {
    const tooLate = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    await expect(submitAppealResponse({ ...baseParams, scheduledTime: tooLate })).rejects.toThrow(
      'Please choose an arrival time within the next two hours.',
    );
  });

  it('accepts a valid Standard response and persists the expected fields', async () => {
    await submitAppealResponse(baseParams);

    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = addDocMock.mock.calls[0];
    expect(payload).toMatchObject({
      appealId: 'appeal-1',
      facilityId: 'facility-1',
      facilityName: 'Nairobi Hospital',
      urgencyLevel: 'Standard',
      donorId: 'donor-1',
      name: 'Jane Doe',
      phone: '0700000000',
      bloodType: 'O-',
      scheduledTime: baseParams.scheduledTime,
      status: 'Confirmed',
      createdAt: 'SERVER_TIMESTAMP',
    });
  });

  it('increments the public stats/global response counter alongside the write', async () => {
    await submitAppealResponse(baseParams);

    expect(incrementMock).toHaveBeenCalledWith(1);
    expect(setDocMock).toHaveBeenCalledWith(
      'stats/global',
      { totalResponses: { __increment: 1 } },
      { merge: true },
    );
  });

  it('clears scheduledTime for Urgent responses even if one was passed in', async () => {
    await submitAppealResponse({ ...baseParams, urgencyLevel: 'Urgent', scheduledTime: null });

    const [, payload] = addDocMock.mock.calls[0];
    expect(payload.scheduledTime).toBeNull();
    expect(payload.urgencyLevel).toBe('Urgent');
  });

  it('allows guest responses with donorId left null', async () => {
    await submitAppealResponse({ ...baseParams, donorId: null });
    const [, payload] = addDocMock.mock.calls[0];
    expect(payload.donorId).toBeNull();
  });
});

describe('markResponseDonated', () => {
  it('updates the response status to Donated and commits the batch', async () => {
    await markResponseDonated('response-1', null);

    expect(batchMock.update).toHaveBeenCalledWith('responses/response-1', {
      status: 'Donated',
      donatedAt: 'SERVER_TIMESTAMP',
    });
    expect(batchMock.commit).toHaveBeenCalledTimes(1);
  });

  it('also increments totalDonations and sets lastDonationDate for a registered donor', async () => {
    await markResponseDonated('response-1', 'donor-1');

    expect(batchMock.update).toHaveBeenCalledTimes(2);
    expect(batchMock.update).toHaveBeenCalledWith(
      'donors/donor-1',
      expect.objectContaining({ totalDonations: { __increment: 1 }, lastDonationDate: expect.any(String) }),
    );
  });

  it('does not touch the donors collection for a guest response (donorId null)', async () => {
    await markResponseDonated('response-1', null);

    expect(batchMock.update).toHaveBeenCalledTimes(1);
    expect(batchMock.update).not.toHaveBeenCalledWith(expect.stringContaining('donors'), expect.anything());
  });
});

describe('listenDonorResponses (FR-010)', () => {
  it('queries the responses collection filtered by donorId, newest first', () => {
    const unsubscribe = vi.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onChange = vi.fn();

    const result = listenDonorResponses('donor-1', onChange);

    expect(onSnapshotMock).toHaveBeenCalledTimes(1);
    const [queryArg, callback] = onSnapshotMock.mock.calls[0];
    expect(queryArg.clauses).toContainEqual({ __where: 'donorId', op: '==', value: 'donor-1' });
    expect(queryArg.clauses).toContainEqual({ __orderBy: 'createdAt', direction: 'desc' });
    expect(result).toBe(unsubscribe);

    callback({ docs: [{ id: 'r1', data: () => ({ status: 'Confirmed' }) }] });
    expect(onChange).toHaveBeenCalledWith([{ id: 'r1', status: 'Confirmed' }]);
  });
});

describe('listenFacilityResponses (FR-008)', () => {
  it('queries the responses collection filtered by facilityId, newest first', () => {
    const unsubscribe = vi.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onChange = vi.fn();

    const result = listenFacilityResponses('facility-1', onChange);

    expect(onSnapshotMock).toHaveBeenCalledTimes(1);
    const [queryArg, callback] = onSnapshotMock.mock.calls[0];
    expect(queryArg.clauses).toContainEqual({ __where: 'facilityId', op: '==', value: 'facility-1' });
    expect(queryArg.clauses).toContainEqual({ __orderBy: 'createdAt', direction: 'desc' });
    expect(result).toBe(unsubscribe);

    callback({ docs: [{ id: 'r1', data: () => ({ name: 'Jane Doe' }) }] });
    expect(onChange).toHaveBeenCalledWith([{ id: 'r1', name: 'Jane Doe' }]);
  });
});
