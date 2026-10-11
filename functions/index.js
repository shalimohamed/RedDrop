import AfricasTalking from 'africastalking';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

const atSms = process.env.AT_API_KEY
  ? AfricasTalking({ username: process.env.AT_USERNAME ?? 'sandbox', apiKey: process.env.AT_API_KEY }).SMS
  : null;

const APP_URL = process.env.APP_URL || 'https://reddrop.web.app';

const COMPATIBLE_DONORS = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

async function notify({ recipientId, message, type, appealId }) {
  await db.collection('notifications').add({
    recipientId,
    appealId,
    message,
    type,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function pushToToken(token, title, body) {
  if (!token) {
    logger.warn('pushToToken: no FCM token — push skipped');
    return;
  }
  try {
    const messageId = await messaging.send({ token, notification: { title, body } });
    logger.info('pushToToken: FCM accepted', { messageId });
  } catch (error) {
    logger.warn('pushToToken: FCM send failed', { error: error.message });
  }
}

async function sendSms(phone, message) {
  if (!atSms) { logger.warn('AT SMS skipped: AT_API_KEY not set in environment'); return; }
  if (!phone) { logger.warn('AT SMS skipped: donor has no phone field'); return; }
  try {
    const result = await atSms.send({ to: [phone], message });
    const recipients = result?.SMSMessageData?.Recipients ?? [];
    recipients.forEach((r) => logger.info('AT SMS result', { phone: r.number, status: r.status, cost: r.cost }));
    if (!recipients.length) logger.warn('AT SMS: no recipients in response', { result });
  } catch (error) {
    logger.warn('AT SMS send failed', { error: error.message });
  }
}

export const onAppealCreated = onDocumentCreated('appeals/{appealId}', async (event) => {
  const appeal = event.data.data();
  const appealId = event.params.appealId;
  const eligibleTypes = COMPATIBLE_DONORS[appeal.bloodType] ?? [];

  const donorsSnapshot = await db
    .collection('donors')
    .where('bloodType', 'in', eligibleTypes.slice(0, 30))
    .where('isAvailable', '==', true)
    .get();

  const message = `${appeal.urgencyLevel} appeal: ${appeal.facilityName} needs ${appeal.bloodType} blood.`;

  await Promise.all(
    donorsSnapshot.docs.map(async (donorDoc) => {
      const donor = donorDoc.data();
      await notify({ recipientId: donorDoc.id, message, type: 'appeal_match', appealId });
      await pushToToken(donor.fcmToken, 'RedDrop: compatible appeal nearby', message);
      await sendSms(donor.phone, `RedDrop: ${message} Visit ${APP_URL}/appeals/${appealId} to respond.`);
    }),
  );

  logger.info(`Notified ${donorsSnapshot.size} compatible donor(s) for appeal ${appealId}.`);
});

export const onEventCreated = onDocumentCreated('events/{eventId}', async (event) => {
  const driveEvent = event.data.data();
  const eventId = event.params.eventId;
  const targetTypes = driveEvent.targetBloodTypes ?? [];

  if (!targetTypes.length) return;

  const donorsSnapshot = await db
    .collection('donors')
    .where('bloodType', 'in', targetTypes.slice(0, 30))
    .where('isAvailable', '==', true)
    .get();

  const message = `${driveEvent.facilityName} is hosting "${driveEvent.eventName}" on ${driveEvent.date} at ${driveEvent.location}. Your blood type is needed!`;

  await Promise.all(
    donorsSnapshot.docs.map(async (donorDoc) => {
      const donor = donorDoc.data();
      await notify({ recipientId: donorDoc.id, message, type: 'event_invite', appealId: eventId });
      await pushToToken(donor.fcmToken, 'RedDrop: Blood Drive Near You', message);
    }),
  );

  logger.info(`Notified ${donorsSnapshot.size} donor(s) for event ${eventId}.`);
});

export const onResponseCreated = onDocumentCreated('responses/{responseId}', async (event) => {
  const response = event.data.data();
  const responseId = event.params.responseId;

  logger.info('onResponseCreated fired', { responseId, appealId: response.appealId });

  if (!response.appealId) {
    logger.warn('onResponseCreated: response has no appealId', { responseId });
    return;
  }

  const appealSnap = await db.collection('appeals').doc(response.appealId).get();
  if (!appealSnap.exists) {
    logger.warn('onResponseCreated: appeal not found', { appealId: response.appealId });
    return;
  }
  const appeal = appealSnap.data();
  logger.info('onResponseCreated: appeal found', { facilityId: appeal.facilityId });

  const message = `${response.name} (${response.bloodType}) confirmed for your ${appeal.bloodType} appeal. Contact: ${response.phone}.`;

  await notify({
    recipientId: appeal.facilityId,
    message,
    type: 'donor_response',
    appealId: response.appealId,
  });

  const facilityDoc = await db.collection('facilities').doc(appeal.facilityId).get();
  const fcmToken = facilityDoc.data()?.fcmToken ?? null;
  if (!fcmToken) {
    logger.warn('onResponseCreated: facility has no fcmToken — open the facility dashboard in your browser to register for push');
  } else {
    logger.info('onResponseCreated: facility has fcmToken, pushing');
  }

  await pushToToken(fcmToken, 'RedDrop: Donor Confirmed', message);
});
