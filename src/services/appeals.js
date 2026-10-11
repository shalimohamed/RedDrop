import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { APPEAL_STATUS } from '../utils/urgency';

export function listenAppeal(appealId, onChange) {
  return onSnapshot(doc(db, 'appeals', appealId), (snap) => {
    onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function createAppeal({ facilityId, facilityName, bloodType, urgencyLevel, role }) {
  if (role !== 'facility') {
    throw new Error('Only registered facilities may post blood appeals.');
  }
  if (!facilityId || !bloodType || !urgencyLevel) {
    throw new Error('Facility, blood type, and urgency level are required.');
  }

  return addDoc(collection(db, 'appeals'), {
    facilityId,
    facilityName,
    bloodType,
    urgencyLevel,
    status: APPEAL_STATUS.ACTIVE,
    createdAt: serverTimestamp(),
  });
}

export function listenActiveAppeals(onChange, { limitTo } = {}) {
  const activeQuery = query(
    collection(db, 'appeals'),
    where('status', '==', APPEAL_STATUS.ACTIVE),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(activeQuery, (snapshot) => {
    let appeals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (limitTo) appeals = appeals.slice(0, limitTo);
    onChange(appeals);
  });
}

export function listenFacilityAppeals(facilityId, onChange) {
  const facilityQuery = query(
    collection(db, 'appeals'),
    where('facilityId', '==', facilityId),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(facilityQuery, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function updateAppealUrgency(appealId, urgencyLevel) {
  await updateDoc(doc(db, 'appeals', appealId), { urgencyLevel });
}

export async function closeAppeal(appealId) {
  await updateDoc(doc(db, 'appeals', appealId), { status: APPEAL_STATUS.CLOSED, closedAt: serverTimestamp() });
}

export async function markAppealFulfilled(appealId) {
  await updateDoc(doc(db, 'appeals', appealId), { status: APPEAL_STATUS.FULFILLED, fulfilledAt: serverTimestamp() });
}
