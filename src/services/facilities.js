import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export function listenFacilities(onChange) {
  return onSnapshot(collection(db, 'facilities'), (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function getFacilitiesOnce() {
  const snapshot = await getDocs(collection(db, 'facilities'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveFacilityFcmToken(facilityId, token) {
  await updateDoc(doc(db, 'facilities', facilityId), { fcmToken: token });
}

export async function setFacilityCoordinates(facilityId, { lat, lng, address }) {
  const updates = { lat, lng };
  if (address) updates.address = address;
  await updateDoc(doc(db, 'facilities', facilityId), updates);
}
