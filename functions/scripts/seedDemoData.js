import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// One-off script to backdate sample appeals/responses so the facility and donor
// dashboard trend charts have data to show during a presentation. Uses the Admin
// SDK (bypasses firestore.rules) so it can write historical createdAt timestamps,
// which the app's own client-side functions can't do (they always use serverTimestamp()).
//
// Run from the functions/ directory: node scripts/seedDemoData.js
// Requires a service account key — set SEED_KEY_PATH, or edit the default below.

const KEY_PATH =
  process.env.SEED_KEY_PATH ||
  'C:\\Users\\SHALI\\Downloads\\reddrop-a982a-firebase-adminsdk-fbsvc-c96782c80a.json';
const DONOR_EMAIL = process.env.SEED_DONOR_EMAIL || 'shalimahmud234@gmail.com';
const FACILITY_EMAIL = process.env.SEED_FACILITY_EMAIL || 'shalimahamoud234@gmail.com';

const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const URGENCY_LEVELS = ['Urgent', 'Standard'];
const APPEAL_STATUSES = ['Fulfilled', 'Fulfilled', 'Closed', 'Active'];

// How many docs to drop in each of the last 6 months, oldest first.
const APPEALS_PER_MONTH = [1, 2, 3, 2, 3, 3];
const RESPONSES_PER_MONTH = [1, 1, 2, 2, 2, 3];

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

async function main() {
  const donorUser = await auth.getUserByEmail(DONOR_EMAIL);
  const facilityUser = await auth.getUserByEmail(FACILITY_EMAIL);

  const [donorSnap, facilitySnap] = await Promise.all([
    db.collection('donors').doc(donorUser.uid).get(),
    db.collection('facilities').doc(facilityUser.uid).get(),
  ]);

  if (!donorSnap.exists) {
    throw new Error(`No donors/${donorUser.uid} doc — has ${DONOR_EMAIL} finished donor registration?`);
  }
  if (!facilitySnap.exists) {
    throw new Error(`No facilities/${facilityUser.uid} doc — has ${FACILITY_EMAIL} finished facility registration?`);
  }

  const donor = donorSnap.data();
  const facility = facilitySnap.data();

  console.log(`Donor:    ${donor.fullName} (${donorUser.uid})`);
  console.log(`Facility: ${facility.facilityName} (${facilityUser.uid})`);

  const appealIds = [];
  const appealsBatch = db.batch();
  for (let m = 5; m >= 0; m--) {
    for (let i = 0; i < APPEALS_PER_MONTH[5 - m]; i++) {
      const ref = db.collection('appeals').doc();
      appealsBatch.set(ref, {
        facilityId: facilityUser.uid,
        facilityName: facility.facilityName,
        bloodType: pick(BLOOD_TYPES),
        urgencyLevel: pick(URGENCY_LEVELS),
        status: m === 0 && i === APPEALS_PER_MONTH[5 - m] - 1 ? 'Active' : pick(APPEAL_STATUSES),
        createdAt: Timestamp.fromDate(randomDateMonthsAgo(m)),
      });
      appealIds.push(ref.id);
    }
  }
  await appealsBatch.commit();
  console.log(`Seeded ${appealIds.length} appeals for the facility trend chart.`);

  const responsesBatch = db.batch();
  let responseCount = 0;
  for (let m = 5; m >= 0; m--) {
    for (let i = 0; i < RESPONSES_PER_MONTH[5 - m]; i++) {
      const ref = db.collection('responses').doc();
      responsesBatch.set(ref, {
        appealId: pick(appealIds),
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
      });
      responseCount += 1;
    }
  }
  await responsesBatch.commit();
  console.log(`Seeded ${responseCount} responses for the donor activity chart.`);

  await db.doc('stats/global').set({ totalResponses: FieldValue.increment(responseCount) }, { merge: true });
  console.log(`Bumped stats/global.totalResponses by ${responseCount} to match (keeps the landing page count consistent).`);

  console.log('\nDone — refresh the facility and donor dashboards to see the trend charts populated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
