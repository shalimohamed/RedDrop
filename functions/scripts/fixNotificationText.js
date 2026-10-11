import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// onResponseCreated (functions/index.js) fires on any Firestore write to
// responses/{id}, including the admin-SDK seed writes — so it already baked
// "Shali Mohamed (A+) confirmed for your ... appeal" into notification docs
// at creation time, before the donor was corrected to O-. Updating the
// response doc afterward doesn't touch that already-written message string.
// This patches the stored text to match.

const KEY_PATH =
  process.env.SEED_KEY_PATH ||
  'C:\\Users\\SHALI\\Downloads\\reddrop-a982a-firebase-adminsdk-fbsvc-c96782c80a.json';
const DONOR_EMAIL = process.env.SEED_DONOR_EMAIL || 'shalimahmud234@gmail.com';
const FACILITY_EMAIL = process.env.SEED_FACILITY_EMAIL || 'shalimahamoud234@gmail.com';

initializeApp({ credential: cert(KEY_PATH) });
const auth = getAuth();
const db = getFirestore();

async function main() {
  const donorUser = await auth.getUserByEmail(DONOR_EMAIL);
  const facilityUser = await auth.getUserByEmail(FACILITY_EMAIL);

  const donorSnap = await db.collection('donors').doc(donorUser.uid).get();
  const donor = donorSnap.data();
  console.log(`Donor: ${donor.fullName}, now ${donor.bloodType}, phone ${donor.phone}`);

  const notificationsSnap = await db
    .collection('notifications')
    .where('recipientId', '==', facilityUser.uid)
    .get();

  const namePrefix = `${donor.fullName} (`;
  const contactSuffix = `Contact: ${donor.phone}.`;

  const toFix = notificationsSnap.docs.filter((d) => {
    const msg = d.data().message ?? '';
    return d.data().type === 'donor_response' && msg.startsWith(namePrefix) && msg.includes(contactSuffix);
  });

  console.log(`${notificationsSnap.size} notifications for this facility, ${toFix.length} are stale "confirmed" messages from this donor.`);

  if (toFix.length === 0) {
    console.log('Nothing to fix.');
    return;
  }

  const batch = db.batch();
  toFix.forEach((doc) => {
    const oldMessage = doc.data().message;
    const newMessage = oldMessage.replace(/^([^(]+)\(([^)]+)\)/, `$1(${donor.bloodType})`);
    batch.update(doc.ref, { message: newMessage });
    console.log(`  "${oldMessage}" -> "${newMessage}"`);
  });
  await batch.commit();
  console.log(`Fixed ${toFix.length} notification message(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
