import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [, , keyPath = 'serviceAccountKey.json'] = process.argv;

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch {
  console.error(`Cannot read service account key at: ${keyPath}`);
  console.error('Download it from Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const adminAuth = getAuth();
const db = getFirestore();

async function deleteAllAuthUsers() {
  let pageToken;
  let total = 0;
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    if (page.users.length > 0) {
      const uids = page.users.map((u) => u.uid);
      await adminAuth.deleteUsers(uids);
      total += uids.length;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return total;
}

async function wipeBatch(collectionName) {
  const snap = await db.collection(collectionName).limit(400).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

async function wipeCollection(name) {
  let deleted = 0;
  let round;
  do {
    round = await wipeBatch(name);
    deleted += round;
  } while (round > 0);
  return deleted;
}

const FACILITY_EMAIL = 'testfacility@reddrop.dev';
const FACILITY_PASS  = 'RedDrop2024!';
const DONOR_EMAIL    = 'testdonor@reddrop.dev';
const DONOR_PASS     = 'RedDrop2024!';

async function createAccounts() {
  const now = FieldValue.serverTimestamp();

  const fUser = await adminAuth.createUser({
    email: FACILITY_EMAIL,
    password: FACILITY_PASS,
    displayName: 'Test Hospital',
  });
  await db.collection('users').doc(fUser.uid).set({ role: 'facility', email: FACILITY_EMAIL, createdAt: now });
  await db.collection('facilities').doc(fUser.uid).set({
    facilityName: 'Test Hospital',
    email: FACILITY_EMAIL,
    location: 'Nairobi, Kenya',
    phone: '0700000001',
    isAvailable: true,
    createdAt: now,
  });

  const dUser = await adminAuth.createUser({
    email: DONOR_EMAIL,
    password: DONOR_PASS,
    displayName: 'Test Donor',
  });
  await db.collection('users').doc(dUser.uid).set({ role: 'donor', email: DONOR_EMAIL, createdAt: now });
  await db.collection('donors').doc(dUser.uid).set({
    fullName: 'Test Donor',
    email: DONOR_EMAIL,
    bloodType: 'O+',
    location: 'Nairobi, Kenya',
    phone: '0700000002',
    isAvailable: true,
    totalDonations: 0,
    lastDonationDate: null,
    createdAt: now,
  });

  return { facilityUid: fUser.uid, donorUid: dUser.uid };
}

const COLLECTIONS = ['users', 'donors', 'facilities', 'appeals', 'responses', 'events', 'notifications', 'stats'];

async function main() {
  console.log('RedDrop — Firebase cleanup\n');

  process.stdout.write('1/3  Deleting all Auth users … ');
  const deletedUsers = await deleteAllAuthUsers();
  console.log(`done (${deletedUsers} deleted)`);

  process.stdout.write('2/3  Wiping Firestore … ');
  let totalDocs = 0;
  for (const col of COLLECTIONS) {
    totalDocs += await wipeCollection(col);
  }
  console.log(`done (${totalDocs} documents deleted)`);

  process.stdout.write('3/3  Creating test accounts … ');
  await createAccounts();
  console.log('done\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' TEST ACCOUNTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(` Facility  ${FACILITY_EMAIL}`);
  console.log(`           ${FACILITY_PASS}`);
  console.log();
  console.log(` Donor     ${DONOR_EMAIL}`);
  console.log(`           ${DONOR_PASS}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
