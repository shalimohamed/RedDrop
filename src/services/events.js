import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function createBloodDriveEvent({
  facilityId,
  facilityName,
  eventName,
  date,
  time,
  location,
  targetBloodTypes,
  role,
}) {
  if (role !== 'facility') {
    throw new Error('Only registered facilities may publish blood drive events.');
  }
  if (!eventName || !date || !time || !location || !targetBloodTypes?.length) {
    throw new Error('Event name, date, time, location, and target blood types are required.');
  }
  if (date < new Date().toISOString().slice(0, 10)) {
    throw new Error('Event date cannot be in the past.');
  }

  return addDoc(collection(db, 'events'), {
    facilityId,
    facilityName,
    eventName,
    date,
    time,
    location,
    targetBloodTypes,
    createdAt: serverTimestamp(),
  });
}

export function listenUpcomingEvents(onChange) {
  const upcomingQuery = query(collection(db, 'events'), orderBy('date', 'asc'));
  return onSnapshot(upcomingQuery, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
