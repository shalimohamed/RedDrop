import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const auth = getAuth();
const db = getFirestore();

const TEST_DONOR_EMAIL = 'testdonor@reddrop.dev';
const TEST_PHONE = '+254700000001';

const user = await auth.getUserByEmail(TEST_DONOR_EMAIL);
await db.collection('donors').doc(user.uid).update({ phone: TEST_PHONE });
console.log(`Set phone ${TEST_PHONE} on donor ${TEST_DONOR_EMAIL} (${user.uid})`);
process.exit(0);
