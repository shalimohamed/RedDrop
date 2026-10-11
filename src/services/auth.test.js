import { beforeEach, describe, expect, it, vi } from 'vitest';

const createUserMock = vi.fn();
const signInMock = vi.fn();
const signInWithPopupMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue(undefined);
const updateProfileMock = vi.fn().mockResolvedValue(undefined);
const setDocMock = vi.fn().mockResolvedValue(undefined);
const getDocMock = vi.fn();

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args) => createUserMock(...args),
  signInWithEmailAndPassword: (...args) => signInMock(...args),
  signInWithPopup: (...args) => signInWithPopupMock(...args),
  GoogleAuthProvider: vi.fn(),
  signOut: (...args) => signOutMock(...args),
  updateProfile: (...args) => updateProfileMock(...args),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...path) => path.join('/')),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  setDoc: (...args) => setDocMock(...args),
  getDoc: (...args) => getDocMock(...args),
}));
vi.mock('../firebase/config', () => ({ db: {}, auth: {} }));

const {
  registerDonor,
  registerFacility,
  registerDonorWithGoogle,
  registerFacilityWithGoogle,
  signInWithGoogle,
  hasUserRecord,
  login,
  logout,
  ROLE,
} = await import('./auth');

beforeEach(() => {
  createUserMock.mockReset();
  signInMock.mockReset();
  signInWithPopupMock.mockReset();
  signOutMock.mockClear();
  updateProfileMock.mockClear();
  setDocMock.mockClear();
  getDocMock.mockReset();
});

const fakeUser = { uid: 'uid-1' };

describe('registerDonor (FR-001)', () => {
  it('rejects when a required field is missing', async () => {
    await expect(
      registerDonor({ fullName: '', email: 'a@b.com', password: 'pw', bloodType: 'O-', location: 'Nairobi', phone: '+254700000000' }),
    ).rejects.toThrow('All fields are required to create a donor account.');
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('creates the auth account, then the users and donors records', async () => {
    createUserMock.mockResolvedValue({ user: fakeUser });

    const result = await registerDonor({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'TestPass123!',
      bloodType: 'O-',
      location: 'Nairobi',
      phone: '+254700000000',
    });

    expect(createUserMock).toHaveBeenCalledWith({}, 'jane@example.com', 'TestPass123!');
    expect(updateProfileMock).toHaveBeenCalledWith(fakeUser, { displayName: 'Jane Doe' });

    expect(setDocMock).toHaveBeenCalledWith('users/uid-1', {
      email: 'jane@example.com',
      role: ROLE.DONOR,
      createdAt: 'SERVER_TIMESTAMP',
    });
    expect(setDocMock).toHaveBeenCalledWith('donors/uid-1', {
      fullName: 'Jane Doe',
      bloodType: 'O-',
      location: 'Nairobi',
      phone: '+254700000000',
      isAvailable: true,
      lastDonationDate: null,
      totalDonations: 0,
    });
    expect(result).toBe(fakeUser);
  });
});

describe('registerFacility (FR-002)', () => {
  it('rejects when a required field is missing', async () => {
    await expect(
      registerFacility({
        facilityName: 'Hosp',
        email: 'a@b.com',
        password: 'pw',
        facilityType: '',
        address: 'Addr',
        contactInfo: '0700',
      }),
    ).rejects.toThrow('All fields are required to create a facility account.');
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('creates the auth account with role fixed to facility', async () => {
    createUserMock.mockResolvedValue({ user: fakeUser });

    await registerFacility({
      facilityName: 'Nairobi Hospital',
      email: 'hosp@example.com',
      password: 'TestPass123!',
      facilityType: 'Hospital',
      address: '123 Main St',
      availableHours: '24/7',
      contactInfo: '0700000000',
    });

    expect(setDocMock).toHaveBeenCalledWith('users/uid-1', {
      email: 'hosp@example.com',
      role: ROLE.FACILITY,
      createdAt: 'SERVER_TIMESTAMP',
    });
    expect(setDocMock).toHaveBeenCalledWith('facilities/uid-1', {
      facilityName: 'Nairobi Hospital',
      type: 'Hospital',
      address: '123 Main St',
      availableHours: '24/7',
      contactInfo: '0700000000',
      lat: null,
      lng: null,
    });
  });
});

describe('login / logout (FR-003)', () => {
  it('signs in and returns the user', async () => {
    signInMock.mockResolvedValue({ user: fakeUser });
    const result = await login('jane@example.com', 'TestPass123!');
    expect(signInMock).toHaveBeenCalledWith({}, 'jane@example.com', 'TestPass123!');
    expect(result).toBe(fakeUser);
  });

  it('signs out', async () => {
    await logout();
    expect(signOutMock).toHaveBeenCalledWith({});
  });
});

describe('signInWithGoogle / hasUserRecord', () => {
  it('signs in via popup and returns the user', async () => {
    signInWithPopupMock.mockResolvedValue({ user: fakeUser });
    const result = await signInWithGoogle();
    expect(signInWithPopupMock).toHaveBeenCalled();
    expect(result).toBe(fakeUser);
  });

  it('reports whether users/{uid} already exists', async () => {
    getDocMock.mockResolvedValue({ exists: () => true });
    expect(await hasUserRecord('uid-1')).toBe(true);

    getDocMock.mockResolvedValue({ exists: () => false });
    expect(await hasUserRecord('uid-1')).toBe(false);
  });
});

describe('registerDonorWithGoogle / registerFacilityWithGoogle', () => {
  const googleUser = { uid: 'uid-1', email: 'jane@gmail.com', displayName: 'Jane Doe' };

  it('rejects when a required field is missing', async () => {
    await expect(
      registerDonorWithGoogle(googleUser, { fullName: 'Jane', bloodType: '', location: 'Nairobi', phone: '+254700000000' }),
    ).rejects.toThrow('All fields are required to create a donor account.');
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('writes the users and donors records without creating a new auth account', async () => {
    const result = await registerDonorWithGoogle(googleUser, {
      fullName: 'Jane Doe',
      bloodType: 'O-',
      location: 'Nairobi',
      phone: '+254700000000',
    });

    expect(createUserMock).not.toHaveBeenCalled();
    expect(updateProfileMock).not.toHaveBeenCalled();
    expect(setDocMock).toHaveBeenCalledWith('users/uid-1', {
      email: 'jane@gmail.com',
      role: ROLE.DONOR,
      createdAt: 'SERVER_TIMESTAMP',
    });
    expect(setDocMock).toHaveBeenCalledWith('donors/uid-1', {
      fullName: 'Jane Doe',
      bloodType: 'O-',
      location: 'Nairobi',
      phone: '+254700000000',
      isAvailable: true,
      lastDonationDate: null,
      totalDonations: 0,
    });
    expect(result).toBe(googleUser);
  });

  it('updates the display name when it differs from the Google account', async () => {
    await registerDonorWithGoogle(googleUser, {
      fullName: 'Janet Doe',
      bloodType: 'O-',
      location: 'Nairobi',
      phone: '+254700000000',
    });
    expect(updateProfileMock).toHaveBeenCalledWith(googleUser, { displayName: 'Janet Doe' });
  });

  it('registerFacilityWithGoogle rejects when a required field is missing', async () => {
    await expect(
      registerFacilityWithGoogle(googleUser, { facilityName: 'Hosp', facilityType: '', address: 'Addr', contactInfo: '0700' }),
    ).rejects.toThrow('All fields are required to create a facility account.');
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('registerFacilityWithGoogle writes the users and facilities records', async () => {
    await registerFacilityWithGoogle(googleUser, {
      facilityName: 'Nairobi Hospital',
      facilityType: 'Hospital',
      address: '123 Main St',
      availableHours: '24/7',
      contactInfo: '0700000000',
    });

    expect(createUserMock).not.toHaveBeenCalled();
    expect(setDocMock).toHaveBeenCalledWith('users/uid-1', {
      email: 'jane@gmail.com',
      role: ROLE.FACILITY,
      createdAt: 'SERVER_TIMESTAMP',
    });
    expect(setDocMock).toHaveBeenCalledWith('facilities/uid-1', {
      facilityName: 'Nairobi Hospital',
      type: 'Hospital',
      address: '123 Main St',
      availableHours: '24/7',
      contactInfo: '0700000000',
      lat: null,
      lng: null,
    });
  });
});
