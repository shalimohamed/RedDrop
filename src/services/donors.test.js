import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateDocMock = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...path) => path.join('/')),
  updateDoc: (...args) => updateDocMock(...args),
}));
vi.mock('../firebase/config', () => ({ db: {} }));

const { setDonorAvailability, recordDonation, daysSinceLastDonation } = await import('./donors');

beforeEach(() => {
  updateDocMock.mockReset();
});

describe('daysSinceLastDonation', () => {
  it('returns null when there is no recorded donation', () => {
    expect(daysSinceLastDonation(null)).toBeNull();
  });

  it('computes whole days elapsed since the last donation', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysSinceLastDonation(tenDaysAgo)).toBe(10);
  });

  it('never returns a negative number for a future-dated value', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(daysSinceLastDonation(future)).toBe(0);
  });
});

describe('setDonorAvailability', () => {
  it('writes the isAvailable flag to the donor doc', async () => {
    await setDonorAvailability('donor-1', false);
    expect(updateDocMock).toHaveBeenCalledWith('donors/donor-1', { isAvailable: false });
  });
});

describe('recordDonation', () => {
  it('increments totalDonations and sets lastDonationDate', async () => {
    await recordDonation('donor-1', { totalDonations: 4, lastDonationDate: null });
    expect(updateDocMock).toHaveBeenCalledWith('donors/donor-1', {
      totalDonations: 5,
      lastDonationDate: null,
    });
  });
});
