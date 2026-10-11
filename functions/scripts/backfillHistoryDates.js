import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// The appeal history / donor response UI now shows opened/closed dates and a
// "donated at" timestamp. The demo appeals/responses created by earlier seed
// scripts predate those fields, so this backfills them:
//   - Closed/Fulfilled appeals get a closedAt/fulfilledAt a few days after createdAt.
//   - The older half of the donor's responses become "Donated" with a donatedAt
//     shortly after createdAt (so the feature has something to show); the newer
//     half stay "Confirmed" (as if not yet completed).

const KEY_PATH =
  process.env.SEED_KEY_PATH ||
  'C:\\Users\\SHALI\\Downloads\\reddrop-a982a-firebase-adminsdk-fbsvc-c96782c80a.json';
const DONOR_EMAIL = process.env.SEED_DONOR_EMAIL || 'shalimahmud234@gmail.com';
const FACILITY_EMAIL = process.env.SEED_FACILITY_EMAIL || 'shalimahamoud234@gmail.com';

initializeApp({ credential: cert(KEY_PATH) });
const auth = getAuth();
const db = getFirestore();

function daysAfter(date, days) {
  const now = new Date();
  const d = new Date(date.getTime() + days * 86400000);
  return d > now ? now : d;
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

  // --- appeals: backfill closedAt / fulfilledAt ---
  const appealsSnap = await db.collection('appeals').where('facilityId', '==', facilityUser.uid).get();
  const appealOps = [];
  appealsSnap.docs.forEach((doc) => {
    const appeal = doc.data();
    if (appeal.status === 'Active') return;
    const createdAt = appeal.createdAt?.toDate ? appeal.createdAt.toDate() : null;
    if (!createdAt) return;
    const closeDate = daysAfter(createdAt, 1 + Math.floor(Math.random() * 7));
    const field = appeal.status === 'Fulfilled' ? 'fulfilledAt' : 'closedAt';
    appealOps.push((batch) => batch.update(doc.ref, { [field]: Timestamp.fromDate(closeDate) }));
  });
  await commitInChunks(appealOps);
  console.log(`Backfilled close/fulfil dates on ${appealOps.length} history appeals.`);

  // --- responses: mark the older half Donated with a donatedAt ---
  const responsesSnap = await db.collection('responses').where('donorId', '==', donorUser.uid).get();
  const responses = responsesSnap.docs
    .map((d) => ({ ref: d.ref, ...d.data() }))
    .filter((r) => r.createdAt?.toDate)
    .sort((a, b) => a.createdAt.toDate() - b.createdAt.toDate());

  const donatedCount = Math.floor(responses.length / 2);
  const olderHalf = responses.slice(0, donatedCount);

  const responseOps = olderHalf.map((r) => (batch) => {
    const createdAt = r.createdAt.toDate();
    const donatedDate = daysAfter(createdAt, Math.random());
    batch.update(r.ref, { status: 'Donated', donatedAt: Timestamp.fromDate(donatedDate) });
  });
  await commitInChunks(responseOps);
  console.log(`Marked ${olderHalf.length} of ${responses.length} responses as Donated with a donatedAt.`);

  if (olderHalf.length > 0) {
    const lastDonatedDate = olderHalf
      .map((r) => daysAfter(r.createdAt.toDate(), 0.5))
      .sort((a, b) => a - b)
      .at(-1);
    await db.collection('donors').doc(donorUser.uid).update({
      totalDonations: olderHalf.length,
      lastDonationDate: lastDonatedDate.toISOString(),
    });
    console.log(`Set donor totalDonations=${olderHalf.length}, lastDonationDate=${lastDonatedDate.toISOString()}.`);
  }

  console.log('\nDone — refresh the facility and donor dashboards.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
