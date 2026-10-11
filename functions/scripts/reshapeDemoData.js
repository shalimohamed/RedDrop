import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// Replaces the demo facility's appeals and demo donor's responses with a fresh,
// precisely-shaped dataset for the presentation charts:
//   - Donor activity (responses/month):  Feb 4, Mar 3, Apr 5, May 4, Jun 3, Jul 5
//   - Facility appeals/month: 15-30 range, increasing, July highest
// Old appeals/responses/notifications for this facility+donor pair are deleted
// first so the charts show exactly these numbers, not these numbers plus whatever
// was already there.

const KEY_PATH =
  process.env.SEED_KEY_PATH ||
  'C:\\Users\\SHALI\\Downloads\\reddrop-a982a-firebase-adminsdk-fbsvc-c96782c80a.json';
const DONOR_EMAIL = process.env.SEED_DONOR_EMAIL || 'shalimahmud234@gmail.com';
const FACILITY_EMAIL = process.env.SEED_FACILITY_EMAIL || 'shalimahamoud234@gmail.com';

const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const URGENCY_LEVELS = ['Urgent', 'Standard'];

// oldest -> newest (Feb..Jul relative to "today")
const DONOR_RESPONSES_PER_MONTH = [4, 3, 5, 4, 3, 5];
const FACILITY_APPEALS_PER_MONTH = [16, 19, 22, 25, 28, 30];

initializeApp({ credential: cert(KEY_PATH) });
const auth = getAuth();
const db = getFirestore();

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomDateMonthsAgo(monthsAgo) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(1 + Math.floor(Math.random() * daysInMonth));
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  if (d > now) d.setTime(now.getTime() - Math.random() * 86400000);
  return d;
}

async function commitInChunks(ops) {
  const CHUNK = 450;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = db.batch();
    ops.slice(i, i + CHUNK).forEach((op) => op(batch));
    await batch.commit();
  }
}

async function main() {
  const donorUser = await auth.getUserByEmail(DONOR_EMAIL);
  const facilityUser = await auth.getUserByEmail(FACILITY_EMAIL);

  const donorSnap = await db.collection('donors').doc(donorUser.uid).get();
  const facilitySnap = await db.collection('facilities').doc(facilityUser.uid).get();
  const donor = donorSnap.data();
  const facility = facilitySnap.data();
  console.log(`Donor: ${donor.fullName} (${donor.bloodType})`);
  console.log(`Facility: ${facility.facilityName}`);

  // --- 1. wipe old appeals / responses / notifications for this pair ---
  const [oldAppealsSnap, oldResponsesSnap, facilityNotifsSnap, donorNotifsSnap] = await Promise.all([
    db.collection('appeals').where('facilityId', '==', facilityUser.uid).get(),
    db.collection('responses').where('donorId', '==', donorUser.uid).get(),
    db.collection('notifications').where('recipientId', '==', facilityUser.uid).get(),
    db.collection('notifications').where('recipientId', '==', donorUser.uid).get(),
  ]);

  const oldResponseCount = oldResponsesSnap.size;

  const deleteOps = [
    ...oldAppealsSnap.docs.map((d) => (batch) => batch.delete(d.ref)),
    ...oldResponsesSnap.docs.map((d) => (batch) => batch.delete(d.ref)),
    ...facilityNotifsSnap.docs.map((d) => (batch) => batch.delete(d.ref)),
    ...donorNotifsSnap.docs.map((d) => (batch) => batch.delete(d.ref)),
  ];
  await commitInChunks(deleteOps);
  console.log(
    `Deleted ${oldAppealsSnap.size} old appeals, ${oldResponsesSnap.size} old responses, ` +
      `${facilityNotifsSnap.size + donorNotifsSnap.size} old notifications.`,
  );

  // --- 2. create fresh appeals, grouped by month bucket ---
  const appealIdsByMonth = [];
  const appealCreateOps = [];
  for (let m = 5; m >= 0; m--) {
    const count = FACILITY_APPEALS_PER_MONTH[5 - m];
    const idsThisMonth = [];
    for (let i = 0; i < count; i++) {
      const ref = db.collection('appeals').doc();
      idsThisMonth.push(ref.id);
      const status = m === 0 && i >= count - 3 ? 'Active' : Math.random() < 0.7 ? 'Fulfilled' : 'Closed';
      appealCreateOps.push((batch) =>
        batch.set(ref, {
          facilityId: facilityUser.uid,
          facilityName: facility.facilityName,
          bloodType: pick(BLOOD_TYPES),
          urgencyLevel: pick(URGENCY_LEVELS),
          status,
          createdAt: Timestamp.fromDate(randomDateMonthsAgo(m)),
        }),
      );
    }
    appealIdsByMonth.push(idsThisMonth); // m runs 5(Feb)->0(Jul), so push keeps Feb..Jul order
  }
  await commitInChunks(appealCreateOps);
  const totalAppeals = FACILITY_APPEALS_PER_MONTH.reduce((a, b) => a + b, 0);
  console.log(`Created ${totalAppeals} appeals across Feb-Jul: [${FACILITY_APPEALS_PER_MONTH.join(', ')}].`);

  // --- 3. create fresh responses, linked to that month's appeals where possible ---
  const responseCreateOps = [];
  for (let m = 5; m >= 0; m--) {
    const monthIndex = 5 - m; // 0=Feb..5=Jul, matches appealIdsByMonth order
    const count = DONOR_RESPONSES_PER_MONTH[monthIndex];
    const pool = appealIdsByMonth[monthIndex];
    for (let i = 0; i < count; i++) {
      const ref = db.collection('responses').doc();
      responseCreateOps.push((batch) =>
        batch.set(ref, {
          appealId: pick(pool),
          facilityId: facilityUser.uid,
          facilityName: facility.facilityName,
          urgencyLevel: pick(URGENCY_LEVELS),
          donorId: donorUser.uid,
          name: donor.fullName,
          phone: donor.phone,
          bloodType: donor.bloodType,
          scheduledTime: null,
          status: 'Confirmed',
          createdAt: Timestamp.fromDate(randomDateMonthsAgo(m)),
        }),
      );
    }
  }
  await commitInChunks(responseCreateOps);
  const totalResponses = DONOR_RESPONSES_PER_MONTH.reduce((a, b) => a + b, 0);
  console.log(`Created ${totalResponses} responses across Feb-Jul: [${DONOR_RESPONSES_PER_MONTH.join(', ')}].`);

  await db
    .doc('stats/global')
    .set({ totalResponses: FieldValue.increment(totalResponses - oldResponseCount) }, { merge: true });
  console.log(`Adjusted stats/global.totalResponses by ${totalResponses - oldResponseCount}.`);

  // --- 4. let onAppealCreated's donor-notify fan-out settle, then clean up the
  // spurious "appeal_match" pings it sent our own demo donor for these synthetic appeals ---
  console.log('Waiting 20s for Cloud Function triggers to finish firing before cleanup...');
  await new Promise((resolve) => setTimeout(resolve, 20000));

  const staleMatchesSnap = await db
    .collection('notifications')
    .where('recipientId', '==', donorUser.uid)
    .where('type', '==', 'appeal_match')
    .get();
  if (staleMatchesSnap.size > 0) {
    await commitInChunks(staleMatchesSnap.docs.map((d) => (batch) => batch.delete(d.ref)));
  }
  console.log(`Cleaned up ${staleMatchesSnap.size} appeal-match notifications spawned by the bulk appeal creation.`);

  console.log('\nDone — refresh the facility and donor dashboards.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
