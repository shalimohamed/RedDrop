import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Simpler fix than reassigning appeals: make the demo donor a universal donor
// (O-), which is compatible with every appeal blood type. Updates the donor
// profile and every one of his own response records to match, so nothing on
// screen shows "A+" next to a response he couldn't actually have given.

const KEY_PATH =
  process.env.SEED_KEY_PATH ||
  'C:\\Users\\SHALI\\Downloads\\reddrop-a982a-firebase-adminsdk-fbsvc-c96782c80a.json';
const DONOR_EMAIL = process.env.SEED_DONOR_EMAIL || 'shalimahmud234@gmail.com';
const FACILITY_EMAIL = process.env.SEED_FACILITY_EMAIL || 'shalimahamoud234@gmail.com';

const COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};
function isCompatible(donorType, requiredType) {
  return Boolean(COMPATIBILITY[requiredType]?.includes(donorType));
}

initializeApp({ credential: cert(KEY_PATH) });
const auth = getAuth();
const db = getFirestore();

async function main() {
  const donorUser = await auth.getUserByEmail(DONOR_EMAIL);
  const facilityUser = await auth.getUserByEmail(FACILITY_EMAIL);

  await db.collection('donors').doc(donorUser.uid).update({ bloodType: 'O-' });
  console.log('Donor bloodType set to O- (universal donor).');

  const responsesSnap = await db.collection('responses').where('donorId', '==', donorUser.uid).get();
  const batch = db.batch();
  responsesSnap.docs.forEach((doc) => batch.update(doc.ref, { bloodType: 'O-' }));
  await batch.commit();
  console.log(`Updated bloodType -> O- on ${responsesSnap.size} of his response records.`);

  // Read-only check: did the earlier fix script's appeal retagging (setting some
  // appeals to A+/AB+) break compatibility for any OTHER donor's response?
  const appealsSnap = await db.collection('appeals').where('facilityId', '==', facilityUser.uid).get();
  const appeals = new Map(appealsSnap.docs.map((d) => [d.id, d.data()]));

  const allResponsesSnap = await db.collection('responses').where('facilityId', '==', facilityUser.uid).get();
  const otherDonorsResponses = allResponsesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.donorId !== donorUser.uid);

  let broken = 0;
  for (const r of otherDonorsResponses) {
    const appeal = appeals.get(r.appealId);
    if (!appeal) continue;
    if (!isCompatible(r.bloodType, appeal.bloodType)) {
      broken += 1;
      console.log(`  COLLATERAL MISMATCH: response ${r.id} (${r.bloodType}) -> appeal ${r.appealId} (now requires ${appeal.bloodType})`);
    }
  }
  console.log(
    broken === 0
      ? `Checked ${otherDonorsResponses.length} responses from other donors — no collateral damage from the earlier appeal retagging.`
      : `${broken} of ${otherDonorsResponses.length} other-donor responses are now mismatched — needs a follow-up fix.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
