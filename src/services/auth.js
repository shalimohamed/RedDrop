import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const ROLE = { DONOR: 'donor', FACILITY: 'facility' };
const googleProvider = new GoogleAuthProvider();

async function writeUserRecord(uid, email, role) {
  await setDoc(doc(db, 'users', uid), {
    email,
    role,
    createdAt: serverTimestamp(),
  });
}

export async function registerDonor({ fullName, email, password, bloodType, location, phone }) {
  if (!fullName || !email || !password || !bloodType || !location || !phone) {
    throw new Error('All fields are required to create a donor account.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: fullName });

  await writeUserRecord(credential.user.uid, email, ROLE.DONOR);

  await setDoc(doc(db, 'donors', credential.user.uid), {
    fullName,
    bloodType,
    location,
    phone,
    isAvailable: true,
    lastDonationDate: null,
    totalDonations: 0,
  });

  return credential.user;
}

export async function registerFacility({
  facilityName,
  email,
  password,
  facilityType,
  address,
  availableHours,
  contactInfo,
}) {
  if (!facilityName || !email || !password || !facilityType || !address || !contactInfo) {
    throw new Error('All fields are required to create a facility account.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: facilityName });

  await writeUserRecord(credential.user.uid, email, ROLE.FACILITY);

  await setDoc(doc(db, 'facilities', credential.user.uid), {
    facilityName,
    type: facilityType,
    address,
    availableHours,
    contactInfo,
    lat: null,
    lng: null,
  });

  return credential.user;
}

export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function hasUserRecord(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists();
}

export async function getUserRole(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data().role : null;
}

export async function registerDonorWithGoogle(user, { fullName, bloodType, location, phone }) {
  if (!fullName || !bloodType || !location || !phone) {
    throw new Error('All fields are required to create a donor account.');
  }

  if (fullName !== user.displayName) {
    await updateProfile(user, { displayName: fullName });
  }

  await writeUserRecord(user.uid, user.email, ROLE.DONOR);

  await setDoc(doc(db, 'donors', user.uid), {
    fullName,
    bloodType,
    location,
    phone,
    isAvailable: true,
    lastDonationDate: null,
    totalDonations: 0,
  });

  return user;
}

export async function registerFacilityWithGoogle(
  user,
  { facilityName, facilityType, address, availableHours, contactInfo },
) {
  if (!facilityName || !facilityType || !address || !contactInfo) {
    throw new Error('All fields are required to create a facility account.');
  }

  if (facilityName !== user.displayName) {
    await updateProfile(user, { displayName: facilityName });
  }

  await writeUserRecord(user.uid, user.email, ROLE.FACILITY);

  await setDoc(doc(db, 'facilities', user.uid), {
    facilityName,
    type: facilityType,
    address,
    availableHours,
    contactInfo,
    lat: null,
    lng: null,
  });

  return user;
}

export async function logout() {
  await signOut(auth);
}
