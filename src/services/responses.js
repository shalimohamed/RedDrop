import { addDoc, collection, doc, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { isCompatible } from '../utils/bloodCompatibility';
import { isScheduledTimeValid } from '../utils/urgency';

export async function submitAppealResponse({
  appealId,
  facilityId,
  facilityName,
  requiredBloodType,
  urgencyLevel,
  donorId = null,
  name,
  phone,
  bloodType,
  scheduledTime = null,
}) {
  if (!appealId || !name || !phone || !bloodType) {
    throw new Error('Name, phone number, and blood type are required.');
  }

  if (!isCompatible(bloodType, requiredBloodType)) {
    throw new Error(
      `A ${bloodType} donor is not compatible with this appeal's required type (${requiredBloodType}).`,
    );
  }

  if (!isScheduledTimeValid(urgencyLevel, scheduledTime)) {
    throw new Error('Please choose an arrival time within the next two hours.');
  }

  const response = await addDoc(collection(db, 'responses'), {
    appealId,
    facilityId,
    facilityName,
    urgencyLevel,
    donorId,
    name,
    phone,
    bloodType,
    scheduledTime: urgencyLevel === 'Urgent' ? null : scheduledTime,
    status: 'Confirmed',
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'stats', 'global'), { totalResponses: increment(1) }, { merge: true });

  return response;
}

export async function markResponseDonated(responseId, donorId) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'responses', responseId), { status: 'Donated', donatedAt: serverTimestamp() });
  if (donorId) {
    batch.update(doc(db, 'donors', donorId), {
      totalDonations: increment(1),
      lastDonationDate: new Date().toISOString(),
    });
  }
  await batch.commit();
}

export function listenDonorResponses(donorId, onChange) {
  const donorQuery = query(
    collection(db, 'responses'),
    where('donorId', '==', donorId),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    donorQuery,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('listenDonorResponses:', err.code, err.message),
  );
}

export function listenFacilityResponses(facilityId, onChange) {
  const facilityQuery = query(
    collection(db, 'responses'),
    where('facilityId', '==', facilityId),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    facilityQuery,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('listenFacilityResponses:', err.code, err.message),
  );
}
