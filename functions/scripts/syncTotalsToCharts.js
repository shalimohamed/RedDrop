import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Two numbers had drifted from what the charts actually show, after several
// rounds of reshaping demo data this session:
//   - Donor "Total donations" stat tile should match the activity chart's
//     total (sum of all 6 months of responses), not just the subset marked
//     "Donated". Was 12 (Donated-only); the chart totals 24.
//   - Landing page "Lives reached" (stats/global.totalResponses) should equal
//     the actual number of response documents system-wide. It's been nudged
//     by increment() calls across several scripts this session, so recompute
//     it from source of truth instead of trusting the running total.

const KEY_PATH =
  process.env.SEED_KEY_PATH ||
  'C:\\Users\\SHALI\\Downloads\\reddrop-a982a-firebase-adminsdk-fbsvc-c96782c80a.json';
const DONOR_EMAIL = process.env.SEED_DONOR_EMAIL || 'shalimahmud234@gmail.com';

initializeApp({ credential: cert(KEY_PATH) });
const auth = getAuth();
const db = getFirestore();

async function main() {
  const donorUser = await auth.getUserByEmail(DONOR_EMAIL);

  // --- donor total donations = total responses shown in the activity chart ---
  const responsesSnap = await db.collection('responses').where('donorId', '==', donorUser.uid).get();
  const responses = responsesSnap.docs
    .map((d) => d.data())
    .filter((r) => r.createdAt?.toDate);

  const mostRecent = responses.map((r) => r.createdAt.toDate()).sort((a, b) => b - a)[0];

  await db.collection('donors').doc(donorUser.uid).update({
    totalDonations: responses.length,
    lastDonationDate: mostRecent ? mostRecent.toISOString() : null,
  });
  console.log(`Donor totalDonations set to ${responses.length} (matches the 6-month activity chart total).`);
  console.log(`lastDonationDate set to ${mostRecent?.toISOString()}.`);

  // --- stats/global.totalResponses = actual count of all response docs ---
  const allResponsesCount = (await db.collection('responses').count().get()).data().count;
  await db.doc('stats/global').set({ totalResponses: allResponsesCount }, { merge: true });
  console.log(`stats/global.totalResponses set to ${allResponsesCount} (actual count of all response docs).`);

  console.log('\nDone — refresh the donor dashboard and the landing page.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
