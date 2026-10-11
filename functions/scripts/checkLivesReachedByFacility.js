import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Cross-check stats/global.totalResponses ("Lives reached") against the sum of
// responses actually tied to EXISTING facilities, rather than a raw count of
// the responses collection — catches orphaned responses (facilityId pointing
// at a deleted/nonexistent facility) that would otherwise inflate the number.

const KEY_PATH =
  process.env.SEED_KEY_PATH ||
  'C:\\Users\\SHALI\\Downloads\\reddrop-a982a-firebase-adminsdk-fbsvc-c96782c80a.json';

initializeApp({ credential: cert(KEY_PATH) });
const db = getFirestore();

async function main() {
  const [facilitiesSnap, statsSnap] = await Promise.all([
    db.collection('facilities').get(),
    db.doc('stats/global').get(),
  ]);

  const facilities = facilitiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`${facilities.length} facility account(s) exist:`);
  facilities.forEach((f) => console.log(`  - ${f.facilityName} (${f.id})`));

  let sumAcrossFacilities = 0;
  for (const facility of facilities) {
    const snap = await db.collection('responses').where('facilityId', '==', facility.id).count().get();
    const count = snap.data().count;
    sumAcrossFacilities += count;
    console.log(`    responses to ${facility.facilityName}: ${count}`);
  }

  const totalResponsesSnap = await db.collection('responses').count().get();
  const totalResponsesRaw = totalResponsesSnap.data().count;
  const orphaned = totalResponsesRaw - sumAcrossFacilities;

  console.log(`\nSum of responses across existing facilities: ${sumAcrossFacilities}`);
  console.log(`Raw response collection count: ${totalResponsesRaw}`);
  console.log(`Orphaned responses (facilityId not matching any existing facility): ${orphaned}`);
  console.log(`stats/global.totalResponses currently reads: ${statsSnap.data()?.totalResponses}`);

  if (orphaned === 0 && statsSnap.data()?.totalResponses === sumAcrossFacilities) {
    console.log('\nAll consistent — "Lives reached" already equals the sum of responses received by existing facilities.');
  } else {
    console.log('\nMismatch found.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
