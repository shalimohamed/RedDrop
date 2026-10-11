import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [, , keyPath = 'serviceAccountKey.json'] = process.argv;
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });

const adminAuth = getAuth();
const db = getFirestore();

const { users } = await adminAuth.listUsers(50);
console.log(`\nAuth users (${users.length}):`);
users.forEach((u) => console.log(`  ${u.email}  [uid: ${u.uid}]`));

const COLLECTIONS = ['users', 'donors', 'facilities', 'appeals', 'responses', 'events', 'stats'];
console.log('\nFirestore doc counts:');
for (const col of COLLECTIONS) {
  const snap = await db.collection(col).count().get();
  console.log(`  ${col.padEnd(14)} ${snap.data().count}`);
}
console.log();
