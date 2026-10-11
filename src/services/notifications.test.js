import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const onSnapshotMock = vi.fn();
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const getTokenMock = vi.fn();
const getMessagingIfSupportedMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc: vi.fn((_db, ...path) => path.join('/')),
  limit: vi.fn((n) => ({ __limit: n })),
  onSnapshot: (...args) => onSnapshotMock(...args),
  orderBy: vi.fn((field, direction) => ({ __orderBy: field, direction })),
  query: vi.fn((ref, ...clauses) => ({ ref, clauses })),
  updateDoc: (...args) => updateDocMock(...args),
  where: vi.fn((field, op, value) => ({ __where: field, op, value })),
}));
vi.mock('firebase/messaging', () => ({
  getToken: (...args) => getTokenMock(...args),
}));
vi.mock('../firebase/config', () => ({
  db: {},
  getMessagingIfSupported: (...args) => getMessagingIfSupportedMock(...args),
}));

const { listenRecipientNotifications, markNotificationRead, registerForPushNotifications } =
  await import('./notifications');

beforeEach(() => {
  onSnapshotMock.mockReset();
  updateDocMock.mockClear();
  getTokenMock.mockReset();
  getMessagingIfSupportedMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listenRecipientNotifications (FR-010)', () => {
  it('queries by recipientId, newest first, limited, and maps snapshot docs', () => {
    const unsubscribe = vi.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onChange = vi.fn();

    const result = listenRecipientNotifications('donor-1', onChange);

    const [queryArg, callback] = onSnapshotMock.mock.calls[0];
    expect(queryArg.clauses).toContainEqual({ __where: 'recipientId', op: '==', value: 'donor-1' });
    expect(queryArg.clauses).toContainEqual({ __orderBy: 'createdAt', direction: 'desc' });
    expect(queryArg.clauses).toContainEqual({ __limit: 10 });
    expect(result).toBe(unsubscribe);

    callback({ docs: [{ id: 'n1', data: () => ({ message: 'hi' }) }] });
    expect(onChange).toHaveBeenCalledWith([{ id: 'n1', message: 'hi' }]);
  });

  it('respects a custom limitTo', () => {
    onSnapshotMock.mockReturnValue(vi.fn());
    listenRecipientNotifications('donor-1', vi.fn(), { limitTo: 3 });
    const [queryArg] = onSnapshotMock.mock.calls[0];
    expect(queryArg.clauses).toContainEqual({ __limit: 3 });
  });
});

describe('markNotificationRead', () => {
  it('sets read: true on the notification doc', async () => {
    await markNotificationRead('n1');
    expect(updateDocMock).toHaveBeenCalledWith('notifications/n1', { read: true });
  });
});

describe('registerForPushNotifications (FR-009)', () => {
  it('returns null when messaging is not supported in this browser', async () => {
    getMessagingIfSupportedMock.mockResolvedValue(null);
    const result = await registerForPushNotifications();
    expect(result).toBeNull();
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it('returns null when the user denies notification permission', async () => {
    getMessagingIfSupportedMock.mockResolvedValue({});
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('denied') });

    const result = await registerForPushNotifications();
    expect(result).toBeNull();
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it('fetches an FCM token once permission is granted', async () => {
    const messaging = {};
    getMessagingIfSupportedMock.mockResolvedValue(messaging);
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
    getTokenMock.mockResolvedValue('fake-fcm-token');

    const result = await registerForPushNotifications();
    expect(result).toBe('fake-fcm-token');
    expect(getTokenMock).toHaveBeenCalledWith(messaging, expect.objectContaining({ vapidKey: expect.anything() }));
  });
});
