import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function setDonorAvailability(donorId, isAvailable) {
  await updateDoc(doc(db, 'donors', donorId), { isAvailable });
}

export async function saveDonorFcmToken(donorId, token) {
  await updateDoc(doc(db, 'donors', donorId), { fcmToken: token });
}

export async function recordDonation(donorId, { totalDonations, lastDonationDate }) {
  await updateDoc(doc(db, 'donors', donorId), {
    totalDonations: totalDonations + 1,
    lastDonationDate,
  });
}

export function daysSinceLastDonation(lastDonationDate) {
  if (!lastDonationDate) return null;
  const last = new Date(lastDonationDate);
  const diffMs = Date.now() - last.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}
