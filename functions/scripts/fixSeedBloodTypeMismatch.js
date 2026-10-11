import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Corrective one-off: seedDemoData.js linked each seeded response to a random
// appeal, ignoring blood-type compatibility (the real submitAppealResponse()
// enforces this, but this script wrote straight to Firestore and skipped it).
// This reassigns every incompatible response to an appeal the donor could
// actually donate for, retagging enough appeals as A+/AB+ to cover them.

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

  const donorSnap = await db.collection('donors').doc(donorUser.uid).get();
  const donorBloodType = donorSnap.data().bloodType;
  console.log(`Donor: ${donorSnap.data().fullName} — ${donorBloodType}`);

  const appealsSnap = await db.collection('appeals').where('facilityId', '==', facilityUser.uid).get();
  const appeals = appealsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const responsesSnap = await db.collection('responses').where('donorId', '==', donorUser.uid).get();
  const responses = responsesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  console.log(`${appeals.length} appeals from this facility, ${responses.length} responses from this donor.`);

  const mismatched = responses.filter((r) => {
    const appeal = appeals.find((a) => a.id === r.appealId);
    return !appeal || !isCompatible(donorBloodType, appeal.bloodType);
  });
  console.log(`${mismatched.length} of ${responses.length} responses reference a blood-incompatible appeal.`);

  if (mismatched.length === 0) {
    console.log('Nothing to fix.');
    return;
  }
  if (appeals.length < mismatched.length) {
    throw new Error(
      `Only ${appeals.length} appeals exist but ${mismatched.length} responses need a unique compatible match.`,
    );
  }

  const compatibleCycle = ['A+', 'AB+'];
  const batch = db.batch();
  mismatched.forEach((response, i) => {
    const appeal = appeals[i];
    const newBloodType = compatibleCycle[i % compatibleCycle.length];
    batch.update(db.collection('appeals').doc(appeal.id), { bloodType: newBloodType });
    batch.update(db.collection('responses').doc(response.id), { appealId: appeal.id });
    console.log(
      `  response ${response.id} (was -> appeal ${response.appealId}) reassigned -> appeal ${appeal.id}, set to ${newBloodType}`,
    );
  });
  await batch.commit();
  console.log('Fixed. Every response now points to a blood-compatible appeal.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
